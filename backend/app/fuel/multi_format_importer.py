# app/fuel/multi_format_importer.py

import pandas as pd
import json
import re
from datetime import datetime, date
from decimal import Decimal
import uuid
from app.extensions import db
from app.fuel.models import ServiceRecord, FuelStation, ServiceType, VehicleCard, ImportBatch, ImportError
from app.vehicle.models import Vehicles


class MultiFormatCSVImporter:
    """3社の異なるCSVフォーマットに対応したインポーター"""
    
    def __init__(self):
        self.batch_id = None
        self.import_batch = None
        self.supported_formats = {
            'eneos_detail': self._import_eneos_detail_format,
            'bill_format1': self._import_bill_format1,
            'bill_format2': self._import_bill_format2
        }
    
    def detect_csv_format(self, file_path):
        """CSVフォーマットを自動判定"""
        try:
            # 複数のエンコーディングを試す
            encodings = ['shift_jis', 'utf-8', 'cp932', 'euc-jp']
            df_sample = None
            
            for encoding in encodings:
                try:
                    df_sample = pd.read_csv(file_path, nrows=3, encoding=encoding)
                    break
                except UnicodeDecodeError:
                    continue
            
            if df_sample is None:
                return 'unknown', 'shift_jis'
            
            columns = [str(col).lower() for col in df_sample.columns.tolist()]
            
            # フォーマット1: 詳細形式（20250531.csvのような形式）
            detail_keywords = ['フォーマット区分', '利用年月日', '車両番号', 'カード', '商品名']
            if any(keyword in str(col) for col in df_sample.columns for keyword in detail_keywords):
                return 'eneos_detail', encoding
            
            # フォーマット2: 請求書形式1（請求書 1.csvのような形式）
            bill1_keywords = ['顧客', '取引年月日', '車番', '給油', '商品', '数量', '単価']
            if any(keyword in str(col) for col in df_sample.columns for keyword in bill1_keywords):
                return 'bill_format1', encoding
            
            # フォーマット3: 請求書形式2（請求書データ_xxx.csvのような形式）
            bill2_keywords = ['顧客コード', 'ベースコード', 'カード番号', '利用日', '商品コード']
            if any(keyword in str(col) for col in df_sample.columns for keyword in bill2_keywords):
                return 'bill_format2', encoding
            
            return 'unknown', encoding
            
        except Exception as e:
            print(f"フォーマット判定エラー: {e}")
            return 'unknown', 'shift_jis'
    
    def import_csv(self, file_path, format_type=None, created_by=None):
        """メインのCSVインポート処理"""
        
        # バッチIDの生成
        self.batch_id = f"BATCH_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{str(uuid.uuid4())[:8]}"
        
        # フォーマット自動判定
        if not format_type:
            format_type, encoding = self.detect_csv_format(file_path)
        else:
            encoding = 'shift_jis'  # デフォルト
        
        # インポートバッチの作成
        import os
        file_name = os.path.basename(file_path)
        file_size = os.path.getsize(file_path)
        
        self.import_batch = ImportBatch(
            batch_id=self.batch_id,
            file_name=file_name,
            file_size=file_size,
            csv_format_type=format_type,
            created_by=created_by or 'system'
        )
        db.session.add(self.import_batch)
        db.session.commit()
        
        try:
            # フォーマット別の処理を実行
            if format_type in self.supported_formats:
                result = self.supported_formats[format_type](file_path, encoding)
            else:
                raise ValueError(f"サポートされていないフォーマットです: {format_type}")
            
            # バッチ情報の更新
            self.import_batch.status = 'completed'
            self.import_batch.import_completed_at = datetime.now()
            self.import_batch.total_rows = result['total_rows']
            self.import_batch.success_rows = result['success_rows']
            self.import_batch.error_rows = result['error_rows']
            self.import_batch.duplicate_rows = result['duplicate_rows']
            self.import_batch.skipped_rows = result.get('skipped_rows', 0)
            
            db.session.commit()
            return result
            
        except Exception as e:
            # エラー時のバッチ更新
            self.import_batch.status = 'failed'
            self.import_batch.error_message = str(e)
            self.import_batch.import_completed_at = datetime.now()
            db.session.commit()
            raise e
    
    def _import_eneos_detail_format(self, file_path, encoding):
        """ENEOS詳細形式のCSV取り込み（20250531.csv形式）"""
        try:
            df = pd.read_csv(file_path, encoding=encoding)
            
            success_count = 0
            error_count = 0
            duplicate_count = 0
            skipped_count = 0
            
            for index, row in df.iterrows():
                try:
                    # データの解析
                    raw_data = row.to_dict()
                    
                    # 利用年月日の解析（数値形式: 20250531）
                    service_date = self._parse_date_numeric(row.get('利用年月日'))
                    if not service_date:
                        self._log_error(index + 2, 'validation', '利用年月日が無効です', str(raw_data))
                        error_count += 1
                        continue
                    
                    # 車両の特定
                    vehicle_number = str(row.get('車両番号', '')).strip()
                    card_code = str(row.get('カードコード', '')).strip()
                    vehicle = self._find_vehicle_by_number_or_card(vehicle_number, card_code)
                    
                    # 商品情報の解析
                    product_name = str(row.get('商品名称', '')).strip()
                    quantity = self._parse_decimal(row.get('数量'))
                    unit_price_before_tax = self._parse_decimal(row.get('単価（税抜）'))
                    unit_price_with_tax = self._parse_decimal(row.get('単価（税込）'))
                    amount_before_tax = self._parse_decimal(row.get('金額（税抜）'))
                    amount_with_tax = self._parse_decimal(row.get('金額（税込）'))
                    
                    # サービス種別の判定
                    service_type = self._determine_service_type_from_product(product_name)
                    
                    # スタンド情報
                    station_name = str(row.get('給油所名称', '')).strip()
                    fuel_station = self._find_or_create_station(station_name, 'ENEOS', row)
                    
                    # 重複チェック
                    if self._is_duplicate_record(vehicle.id if vehicle else None, service_date, 
                                                 service_type.id if service_type else None, 
                                                 quantity, amount_with_tax):
                        duplicate_count += 1
                        continue
                    
                    # サービス記録の作成
                    service_record = ServiceRecord(
                        vehicle_id=vehicle.id if vehicle else None,
                        fuel_station_id=fuel_station.id if fuel_station else None,
                        service_type_id=service_type.id if service_type else None,
                        service_date=service_date,
                        product_name=product_name,
                        quantity=quantity,
                        unit_price=unit_price_with_tax,
                        unit_price_before_tax=unit_price_before_tax,
                        amount_before_tax=amount_before_tax,
                        tax_amount=(amount_with_tax - amount_before_tax) if (amount_with_tax and amount_before_tax) else None,
                        total_amount=amount_with_tax,
                        card_number_masked=card_code[-4:] if len(card_code) >= 4 else card_code,
                        import_file_name=self.import_batch.file_name,
                        import_batch_id=self.batch_id,
                        csv_format_type='eneos_detail',
                        csv_row_number=index + 2,
                        raw_data=json.dumps(raw_data, ensure_ascii=False, default=str)
                    )
                    
                    db.session.add(service_record)
                    success_count += 1
                    
                except Exception as e:
                    self._log_error(index + 2, 'processing', str(e), str(row.to_dict()))
                    error_count += 1
                    continue
            
            db.session.commit()
            
            return {
                'total_rows': len(df),
                'success_rows': success_count,
                'error_rows': error_count,
                'duplicate_rows': duplicate_count,
                'skipped_rows': skipped_count
            }
            
        except Exception as e:
            raise Exception(f"ENEOS詳細形式CSV読み込みエラー: {str(e)}")
    
    def _import_bill_format1(self, file_path, encoding):
        """請求書形式1のCSV取り込み（請求書 1.csv形式）"""
        try:
            df = pd.read_csv(file_path, encoding=encoding)
            
            success_count = 0
            error_count = 0
            duplicate_count = 0
            skipped_count = 0
            
            for index, row in df.iterrows():
                try:
                    raw_data = row.to_dict()
                    
                    # 取引年月日の解析（数値形式: 20250401）
                    service_date = self._parse_date_numeric(row.get('取引年月日'))
                    if not service_date:
                        self._log_error(index + 2, 'validation', '取引年月日が無効です', str(raw_data))
                        error_count += 1
                        continue
                    
                    # 車両の特定
                    vehicle_number = str(row.get('車番', '')).strip()
                    vehicle = self._find_vehicle_by_number(vehicle_number)
                    
                    # 商品情報の解析
                    product_name = str(row.get('商品名', '')).strip()
                    quantity = self._parse_decimal(row.get('数量'))
                    unit_price = self._parse_decimal(row.get('単価'))
                    amount = self._parse_decimal(row.get('商品代'))
                    tax_amount = self._parse_decimal(row.get('消費税'))
                    
                    # サービス種別の判定
                    service_type = self._determine_service_type_from_product(product_name)
                    
                    # スタンド情報
                    station_name = str(row.get('給油所名', '')).strip()
                    fuel_station = self._find_or_create_station(station_name, 'Unknown', row)
                    
                    # 重複チェック
                    if self._is_duplicate_record(vehicle.id if vehicle else None, service_date,
                                                 service_type.id if service_type else None,
                                                 quantity, amount):
                        duplicate_count += 1
                        continue
                    
                    # サービス記録の作成
                    service_record = ServiceRecord(
                        vehicle_id=vehicle.id if vehicle else None,
                        fuel_station_id=fuel_station.id if fuel_station else None,
                        service_type_id=service_type.id if service_type else None,
                        service_date=service_date,
                        product_name=product_name,
                        quantity=quantity,
                        unit_price=unit_price,
                        amount_before_tax=amount - tax_amount if (amount and tax_amount) else amount,
                        tax_amount=tax_amount,
                        total_amount=amount,
                        import_file_name=self.import_batch.file_name,
                        import_batch_id=self.batch_id,
                        csv_format_type='bill_format1',
                        csv_row_number=index + 2,
                        raw_data=json.dumps(raw_data, ensure_ascii=False, default=str)
                    )
                    
                    db.session.add(service_record)
                    success_count += 1
                    
                except Exception as e:
                    self._log_error(index + 2, 'processing', str(e), str(row.to_dict()))
                    error_count += 1
                    continue
            
            db.session.commit()
            
            return {
                'total_rows': len(df),
                'success_rows': success_count,
                'error_rows': error_count,
                'duplicate_rows': duplicate_count,
                'skipped_rows': skipped_count
            }
            
        except Exception as e:
            raise Exception(f"請求書形式1 CSV読み込みエラー: {str(e)}")
    
    def _import_bill_format2(self, file_path, encoding):
        """請求書形式2のCSV取り込み（請求書データ_xxx.csv形式）"""
        try:
            df = pd.read_csv(file_path, encoding=encoding)
            
            success_count = 0
            error_count = 0
            duplicate_count = 0
            skipped_count = 0
            
            for index, row in df.iterrows():
                try:
                    raw_data = row.to_dict()
                    
                    # 利用日の解析（数値形式: 20250531）
                    service_date = self._parse_date_numeric(row.get('利用日'))
                    if not service_date:
                        self._log_error(index + 2, 'validation', '利用日が無効です', str(raw_data))
                        error_count += 1
                        continue
                    
                    # 車両の特定
                    card_number = str(row.get('カード番号', '')).strip()
                    vehicle = self._find_vehicle_by_card_number(card_number)
                    
                    # 商品情報の解析
                    product_name = str(row.get('商品名', '')).strip()
                    quantity = self._parse_decimal(row.get('数量'))
                    unit_price = self._parse_decimal(row.get('単価'))
                    amount = self._parse_decimal(row.get('金額'))
                    
                    # 区分から給油以外を判定
                    kubun = self._parse_integer(row.get('区分', 0))
                    if kubun == -1:  # マイナス区分は返品・キャンセルなのでスキップ
                        skipped_count += 1
                        continue
                    
                    # サービス種別の判定
                    service_type = self._determine_service_type_from_product(product_name)
                    
                    # スタンド情報
                    station_code = str(row.get('給油所コード', '')).strip()
                    station_name = str(row.get('給油所名', '')).strip()
                    fuel_station = self._find_or_create_station_by_code(station_code, station_name, row)
                    
                    # 重複チェック
                    if self._is_duplicate_record(vehicle.id if vehicle else None, service_date,
                                                 service_type.id if service_type else None,
                                                 quantity, amount):
                        duplicate_count += 1
                        continue
                    
                    # サービス記録の作成
                    service_record = ServiceRecord(
                        vehicle_id=vehicle.id if vehicle else None,
                        fuel_station_id=fuel_station.id if fuel_station else None,
                        service_type_id=service_type.id if service_type else None,
                        service_date=service_date,
                        product_code=str(row.get('商品コード', '')).strip(),
                        product_name=product_name,
                        quantity=quantity,
                        unit_price=unit_price,
                        total_amount=amount,
                        card_number_masked=card_number[-4:] if len(card_number) >= 4 else card_number,
                        transaction_id=str(row.get('チャージ番号', '')).strip(),
                        import_file_name=self.import_batch.file_name,
                        import_batch_id=self.batch_id,
                        csv_format_type='bill_format2',
                        csv_row_number=index + 2,
                        raw_data=json.dumps(raw_data, ensure_ascii=False, default=str)
                    )
                    
                    db.session.add(service_record)
                    success_count += 1
                    
                except Exception as e:
                    self._log_error(index + 2, 'processing', str(e), str(row.to_dict()))
                    error_count += 1
                    continue
            
            db.session.commit()
            
            return {
                'total_rows': len(df),
                'success_rows': success_count,
                'error_rows': error_count,
                'duplicate_rows': duplicate_count,
                'skipped_rows': skipped_count
            }
            
        except Exception as e:
            raise Exception(f"請求書形式2 CSV読み込みエラー: {str(e)}")
    
    # ユーティリティメソッド
    def _parse_date_numeric(self, date_value):
        """数値形式の日付を解析（20250531 → 2025-05-31）"""
        if pd.isna(date_value) or not date_value:
            return None
        
        try:
            date_str = str(int(date_value)).zfill(8)  # 8桁にゼロパディング
            if len(date_str) == 8:
                year = int(date_str[:4])
                month = int(date_str[4:6])
                day = int(date_str[6:8])
                return date(year, month, day)
        except (ValueError, TypeError):
            pass
        
        return None
    
    def _parse_decimal(self, value):
        """数値をDecimalに変換"""
        if pd.isna(value) or value == '' or value is None:
            return None
        
        try:
            # 文字列の場合、カンマを除去
            if isinstance(value, str):
                value = value.replace(',', '').replace('円', '').replace('L', '').strip()
                if value == '':
                    return None
            
            return Decimal(str(value))
        except (ValueError, TypeError, decimal.InvalidOperation):
            return None
    
    def _parse_integer(self, value):
        """数値をintegerに変換"""
        if pd.isna(value) or value == '' or value is None:
            return None
        
        try:
            if isinstance(value, str):
                value = value.replace(',', '').strip()
                if value == '':
                    return None
            
            return int(float(value))
        except (ValueError, TypeError):
            return None
    
    def _find_vehicle_by_number_or_card(self, vehicle_number, card_code):
        """車両番号またはカードコードから車両を特定"""
        # まず車両番号で検索
        if vehicle_number:
            vehicle = self._find_vehicle_by_number(vehicle_number)
            if vehicle:
                return vehicle
        
        # カードコードで検索
        if card_code:
            vehicle = self._find_vehicle_by_card_number(card_code)
            if vehicle:
                return vehicle
        
        return None
    
    def _find_vehicle_by_number(self, vehicle_number):
        """車両番号から車両を特定"""
        if not vehicle_number:
            return None
        
        # 車両テーブルから検索（複数のフィールドを確認）
        vehicle = Vehicles.query.filter(
            db.or_(
                Vehicles.自動車登録番号および車両番号.like(f'%{vehicle_number}%'),
                Vehicles.型式.like(f'%{vehicle_number}%'),
                Vehicles.車台番号.like(f'%{vehicle_number}%')
            )
        ).first()
        
        return vehicle
    
    def _find_vehicle_by_card_number(self, card_number):
        """カード番号から車両を特定"""
        if not card_number:
            return None
        
        # VehicleCardテーブルから検索
        vehicle_card = VehicleCard.query.filter(
            VehicleCard.card_number.like(f'%{card_number}%')
        ).first()
        
        if vehicle_card:
            return vehicle_card.vehicle
        
        return None
    
    def _determine_service_type_from_product(self, product_name):
        """商品名からサービス種別を判定"""
        if not product_name:
            return ServiceType.query.filter_by(service_code='OTHER').first()
        
        product_name_lower = product_name.lower()
        
        # 燃料関連
        if any(keyword in product_name_lower for keyword in ['軽油', 'diesel', 'ディーゼル']):
            return ServiceType.query.filter_by(service_code='FUEL_DIESEL').first()
        elif any(keyword in product_name_lower for keyword in ['ハイオク', 'premium', 'プレミアム']):
            return ServiceType.query.filter_by(service_code='FUEL_PREMIUM').first()
        elif any(keyword in product_name_lower for keyword in ['レギュラー', 'regular']):
            return ServiceType.query.filter_by(service_code='FUEL_REGULAR').first()
        
        # アドブルー
        elif any(keyword in product_name_lower for keyword in ['アドブルー', 'adblue', '尿素水']):
            return ServiceType.query.filter_by(service_code='ADBLUE').first()
        
        # 洗車
        elif any(keyword in product_name_lower for keyword in ['洗車', 'wash', '洗浄']):
            return ServiceType.query.filter_by(service_code='WASH_BASIC').first()
        
        # オイル交換
        elif any(keyword in product_name_lower for keyword in ['オイル', 'oil']):
            return ServiceType.query.filter_by(service_code='OIL_CHANGE').first()
        
        # デフォルト
        return ServiceType.query.filter_by(service_code='OTHER').first()
    
    def _find_or_create_station(self, station_name, company_name, row_data=None):
        """スタンドを検索または作成"""
        if not station_name:
            return None
        
        # 既存のスタンドを検索
        station = FuelStation.query.filter_by(station_name=station_name).first()
        
        if not station:
            # 新しいスタンドを作成
            station_code = f"{company_name}_{len(FuelStation.query.all()) + 1:05d}"
            
            # 住所情報があれば取得
            prefecture = ''
            city = ''
            if row_data:
                prefecture = str(row_data.get('給油所都道府県名', '')).strip()
                city = str(row_data.get('給油所市区町村名', '')).strip()
            
            station = FuelStation(
                station_code=station_code,
                station_name=station_name,
                company_name=company_name,
                prefecture=prefecture,
                city=city
            )
            db.session.add(station)
            db.session.flush()  # IDを取得するため
        
        return station
    
    def _find_or_create_station_by_code(self, station_code, station_name, row_data=None):
        """スタンドコードで検索または作成"""
        if station_code:
            # スタンドコードで検索
            station = FuelStation.query.filter_by(station_code=station_code).first()
            if station:
                return station
        
        # スタンド名で検索・作成
        return self._find_or_create_station(station_name, 'Unknown', row_data)
    
    def _is_duplicate_record(self, vehicle_id, service_date, service_type_id, quantity, total_amount):
        """重複レコードのチェック"""
        if not all([service_date, total_amount]):
            return False
        
        existing = ServiceRecord.query.filter_by(
            vehicle_id=vehicle_id,
            service_date=service_date,
            service_type_id=service_type_id,
            quantity=quantity,
            total_amount=total_amount
        ).first()
        
        return existing is not None
    
    def _log_error(self, row_number, error_type, error_message, raw_data):
        """エラーログの記録"""
        error_log = ImportError(
            batch_id=self.batch_id,
            csv_row_number=row_number,
            error_type=error_type,
            error_message=error_message,
            raw_csv_data=raw_data
        )
        db.session.add(error_log)
        db.session.flush()  # すぐにDBに記録