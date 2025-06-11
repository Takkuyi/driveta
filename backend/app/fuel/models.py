# backend/app/fuel/models.py

from datetime import datetime, time
from app.extensions import db
from sqlalchemy import Column, String, Integer, Date, Time, Numeric, Text
from flask import current_app

class EnefleRecord(db.Model):
    """エネフレ給油データテーブル"""
    __tablename__ = 'enefle_records'

    id = db.Column(db.Integer, primary_key=True)
    
    # CSVから取得する基本情報
    card_number = db.Column(db.String(20), comment='カード番号（カード車番）')
    transaction_date = db.Column(db.Date, nullable=False, comment='日付')
    station_name = db.Column(db.String(100), comment='給油所名')
    product_name = db.Column(db.String(100), comment='商品名')
    quantity = db.Column(db.Numeric(10, 3), comment='数量（リットル）')
    unit_price = db.Column(db.Numeric(10, 2), comment='単価（円/リットル）')
    total_amount = db.Column(db.Numeric(10, 0), comment='金額（円）')
    slip_number = db.Column(db.String(20), comment='伝票番号')
    input_vehicle_number = db.Column(db.String(20), comment='入力車番')
    fuel_time = db.Column(db.Time, comment='給油時間（HH:MM形式）')
    tax_excluded_unit_price = db.Column(db.Numeric(10, 2), comment='税抜き単価')
    tax_excluded_amount = db.Column(db.Numeric(10, 0), comment='税抜き金額')
    diesel_tax = db.Column(db.Numeric(10, 0), comment='軽油引取税')
    consumption_tax = db.Column(db.Numeric(10, 0), comment='消費税')
    consumption_tax_rate = db.Column(db.Integer, comment='消費税率（%）')
    
    # 追加の管理情報
    station_code = db.Column(db.String(10), comment='給油所コード')
    product_code = db.Column(db.String(10), comment='商品コード')
    branch_code = db.Column(db.String(10), comment='支店コード')
    slip_branch_number = db.Column(db.String(10), comment='伝票番号枝番')
    receipt_ss_code = db.Column(db.String(20), comment='レシートＳＳコード')
    
    # システム管理用
    import_date = db.Column(db.DateTime, default=datetime.now, comment='インポート日時')
    created_at = db.Column(db.DateTime, default=datetime.now, comment='作成日時')
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now, comment='更新日時')

    # インデックス追加推奨フィールド
    __table_args__ = (
        db.Index('idx_enefle_date_vehicle', 'transaction_date', 'input_vehicle_number'),
        db.Index('idx_enefle_card_date', 'card_number', 'transaction_date'),
    )

    def __repr__(self):
        return f'<EnefleRecord {self.transaction_date} {self.input_vehicle_number} {self.product_name}>'

    @classmethod
    def from_csv_row(cls, row_data):
        """CSVの行データからモデルインスタンスを作成"""
        
        # 商品コード8010は除外
        product_code = str(row_data.get('商品コード', '')).strip()
        if product_code == '8010':
            return None
        
        # 日付の変換（YYYYMMDD形式からdate型へ）
        date_str = str(row_data.get('日付', '')).strip()
        transaction_date = None
        if date_str and len(date_str) == 8:
            try:
                year = int(date_str[:4])
                month = int(date_str[4:6])
                day = int(date_str[6:8])
                transaction_date = datetime(year, month, day).date()
            except ValueError:
                pass

        # 給油時間の変換（4桁数字からtime型へ）
        time_str = str(row_data.get('給油時間', '')).strip()
        fuel_time = None
        if time_str and len(time_str) == 4:
            try:
                hours = int(time_str[:2])
                minutes = int(time_str[2:4])
                if 0 <= hours <= 23 and 0 <= minutes <= 59:
                    fuel_time = time(hours, minutes)
            except ValueError:
                pass

        # 数値データの変換（スペース除去とNone処理）
        def safe_decimal(value, default=None):
            if value is None:
                return default
            str_val = str(value).strip()
            if not str_val or str_val == '0' or str_val == '':
                return default
            try:
                return float(str_val)
            except (ValueError, TypeError):
                return default

        def safe_int(value, default=None):
            if value is None:
                return default
            str_val = str(value).strip()
            if not str_val or str_val == '':
                return default
            try:
                return int(float(str_val))
            except (ValueError, TypeError):
                return default

        return cls(
            card_number=str(row_data.get('カード車番', '')).strip() or None,
            transaction_date=transaction_date,
            station_name=str(row_data.get('給油所名', '')).strip() or None,
            product_name=str(row_data.get('商品名', '')).strip() or None,
            quantity=safe_decimal(row_data.get('数量')),
            unit_price=safe_decimal(row_data.get('単価')),
            total_amount=safe_decimal(row_data.get('金額')),
            slip_number=str(row_data.get('伝票番号', '')).strip() or None,
            input_vehicle_number=str(row_data.get('入力車番', '')).strip() or None,
            fuel_time=fuel_time,
            tax_excluded_unit_price=safe_decimal(row_data.get('税抜き単価')),
            tax_excluded_amount=safe_decimal(row_data.get('税抜き金額')),
            diesel_tax=safe_decimal(row_data.get('軽油引取税')),
            consumption_tax=safe_decimal(row_data.get('消費税')),
            consumption_tax_rate=safe_int(row_data.get('消費税率')),
            
            # 追加情報
            station_code=str(row_data.get('給油所コード', '')).strip() or None,
            product_code=product_code or None,
            branch_code=str(row_data.get('支店コード', '')).strip() or None,
            slip_branch_number=str(row_data.get('伝票番号枝番', '')).strip() or None,
            receipt_ss_code=str(row_data.get('レシートＳＳコード', '')).strip() or None,
        )

    def to_dict(self):
        """JSONレスポンス用に辞書化"""
        return {
            'id': self.id,
            'card_number': self.card_number,
            'transaction_date': self.transaction_date.isoformat() if self.transaction_date else None,
            'station_name': self.station_name,
            'product_name': self.product_name,
            'quantity': float(self.quantity) if self.quantity else None,
            'unit_price': float(self.unit_price) if self.unit_price else None,
            'total_amount': float(self.total_amount) if self.total_amount else None,
            'slip_number': self.slip_number,
            'input_vehicle_number': self.input_vehicle_number,
            'fuel_time': self.fuel_time.strftime('%H:%M') if self.fuel_time else None,
            'tax_excluded_unit_price': float(self.tax_excluded_unit_price) if self.tax_excluded_unit_price else None,
            'tax_excluded_amount': float(self.tax_excluded_amount) if self.tax_excluded_amount else None,
            'diesel_tax': float(self.diesel_tax) if self.diesel_tax else None,
            'consumption_tax': float(self.consumption_tax) if self.consumption_tax else None,
            'consumption_tax_rate': self.consumption_tax_rate,
            'import_date': self.import_date.isoformat() if self.import_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class EneosWingRecord(db.Model):
    """エネオスウィング給油データテーブル"""
    __tablename__ = 'eneos_wing_records'

    id = db.Column(db.Integer, primary_key=True)
    
    # 基本情報
    vehicle_number = db.Column(db.String(20), comment='実車番・届先')
    station_code = db.Column(db.String(20), comment='給油ＳＳコード')
    station_name = db.Column(db.String(100), comment='給油ＳＳ名称')
    fuel_date = db.Column(db.Date, nullable=False, comment='給油日付')
    fuel_time = db.Column(db.Time, comment='給油時刻')
    receipt_number = db.Column(db.String(20), comment='レシート番号')
    product_category = db.Column(db.String(10), comment='商品分類')
    product_code = db.Column(db.String(10), comment='商品コード')
    package_code = db.Column(db.String(10), comment='荷姿コード')
    product_name = db.Column(db.String(100), comment='商品名称')
    
    # 数量・金額
    quantity = db.Column(db.Numeric(10, 3), comment='数量')
    converted_quantity = db.Column(db.Numeric(10, 3), comment='換算後数量')
    unit_price_with_tax = db.Column(db.Numeric(10, 2), comment='単価（軽油税込）')
    unit_price_without_tax = db.Column(db.Numeric(10, 2), comment='単価（軽油税抜）')
    amount_with_tax = db.Column(db.Numeric(10, 0), comment='金額（軽油税込）')
    amount_without_tax = db.Column(db.Numeric(10, 0), comment='金額（軽油税抜）')
    consumption_tax = db.Column(db.Numeric(10, 0), comment='消費税')
    total_amount = db.Column(db.Numeric(10, 0), comment='合計金額')
    diesel_tax = db.Column(db.Numeric(10, 0), comment='軽油税')
    
    # 追加情報
    card_code = db.Column(db.String(50), comment='カードコード')
    sales_format = db.Column(db.String(10), comment='販売形態')
    processing_category = db.Column(db.String(10), comment='処理区分')
    
    # システム管理用
    import_date = db.Column(db.DateTime, default=datetime.now, comment='インポート日時')
    created_at = db.Column(db.DateTime, default=datetime.now, comment='作成日時')
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now, comment='更新日時')

    # インデックス
    __table_args__ = (
        db.Index('idx_eneos_wing_date_vehicle', 'fuel_date', 'vehicle_number'),
        db.Index('idx_eneos_wing_station_date', 'station_code', 'fuel_date'),
    )

    def __repr__(self):
        return f'<EneosWingRecord {self.fuel_date} {self.vehicle_number} {self.product_name}>'

    @classmethod
    def from_csv_row(cls, row_data):
        """CSVの行データからモデルインスタンスを作成"""
        
        # 日付の変換（YYYYMMDD形式からdate型へ）
        date_str = str(row_data.get('給油日付', '')).strip()
        fuel_date = None
        if date_str and len(date_str) == 8:
            try:
                year = int(date_str[:4])
                month = int(date_str[4:6])
                day = int(date_str[6:8])
                fuel_date = datetime(year, month, day).date()
            except ValueError:
                pass

        # 給油時刻の変換（4桁数字からtime型へ）
        time_str = str(row_data.get('給油時刻', '')).strip()
        fuel_time = None
        if time_str and len(time_str) == 4:
            try:
                hours = int(time_str[:2])
                minutes = int(time_str[2:4])
                if 0 <= hours <= 23 and 0 <= minutes <= 59:
                    fuel_time = time(hours, minutes)
            except ValueError:
                pass

        # 数値データの変換（プラス/マイナス記号とゼロパディングを処理）
        def safe_decimal(value, default=None):
            if value is None:
                return default
            str_val = str(value).strip()
            if not str_val:
                return default
            
            # プラス記号を除去し、ゼロパディングを除去
            str_val = str_val.replace('+', '').replace('-', '-').lstrip('0')
            if str_val == '' or str_val == '-':
                return default
            
            try:
                return float(str_val)
            except (ValueError, TypeError):
                return default

        return cls(
            vehicle_number=str(row_data.get('実車番・届先', '')).strip() or None,
            station_code=str(row_data.get('給油ＳＳコード', '')).strip() or None,
            station_name=str(row_data.get('給油ＳＳ名称', '')).strip() or None,
            fuel_date=fuel_date,
            fuel_time=fuel_time,
            receipt_number=str(row_data.get('レシート番号', '')).strip() or None,
            product_category=str(row_data.get('商品分類', '')).strip() or None,
            product_code=str(row_data.get('商品コード', '')).strip() or None,
            package_code=str(row_data.get('荷姿コード', '')).strip() or None,
            product_name=str(row_data.get('商品名称', '')).strip() or None,
            
            quantity=safe_decimal(row_data.get('数量')),
            converted_quantity=safe_decimal(row_data.get('換算後数量')),
            unit_price_with_tax=safe_decimal(row_data.get('単価（軽油税込）')),
            unit_price_without_tax=safe_decimal(row_data.get('単価（軽油税抜）')),
            amount_with_tax=safe_decimal(row_data.get('金額（軽油税込）')),
            amount_without_tax=safe_decimal(row_data.get('金額（軽油税抜）')),
            consumption_tax=safe_decimal(row_data.get('消費税')),
            total_amount=safe_decimal(row_data.get('合計金額')),
            diesel_tax=safe_decimal(row_data.get('軽油税')),
            
            card_code=str(row_data.get('カードコード', '')).strip() or None,
            sales_format=str(row_data.get('販売形態', '')).strip() or None,
            processing_category=str(row_data.get('処理区分', '')).strip() or None,
        )

    def to_dict(self):
        """JSONレスポンス用に辞書化"""
        return {
            'id': self.id,
            'vehicle_number': self.vehicle_number,
            'station_code': self.station_code,
            'station_name': self.station_name,
            'fuel_date': self.fuel_date.isoformat() if self.fuel_date else None,
            'fuel_time': self.fuel_time.strftime('%H:%M') if self.fuel_time else None,
            'receipt_number': self.receipt_number,
            'product_category': self.product_category,
            'product_code': self.product_code,
            'package_code': self.package_code,
            'product_name': self.product_name,
            'quantity': float(self.quantity) if self.quantity else None,
            'converted_quantity': float(self.converted_quantity) if self.converted_quantity else None,
            'unit_price_with_tax': float(self.unit_price_with_tax) if self.unit_price_with_tax else None,
            'unit_price_without_tax': float(self.unit_price_without_tax) if self.unit_price_without_tax else None,
            'amount_with_tax': float(self.amount_with_tax) if self.amount_with_tax else None,
            'amount_without_tax': float(self.amount_without_tax) if self.amount_without_tax else None,
            'consumption_tax': float(self.consumption_tax) if self.consumption_tax else None,
            'total_amount': float(self.total_amount) if self.total_amount else None,
            'diesel_tax': float(self.diesel_tax) if self.diesel_tax else None,
            'card_code': self.card_code,
            'sales_format': self.sales_format,
            'processing_category': self.processing_category,
            'import_date': self.import_date.isoformat() if self.import_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

class KitasekiRecord(db.Model):
    """給油記録テーブル"""
    __tablename__ = 'kitaseki_records'

    id = db.Column(db.Integer, primary_key=True)
    
    # キタセキ社CSVの基本情報
    transaction_code = db.Column(db.String(20), comment='取引先コード')
    user_code = db.Column(db.String(20), comment='取引先ユーザーコード')
    customer_type = db.Column(db.String(10), comment='取引先親子区分')
    transaction_date = db.Column(db.Date, nullable=False, comment='取引年月日')
    vehicle_number = db.Column(db.String(20), nullable=False, comment='車番')
    
    # 給油所情報
    fuel_station_type = db.Column(db.String(10), comment='給油所区分')
    highway_type = db.Column(db.String(10), comment='高速区分')
    fuel_company_code = db.Column(db.String(20), comment='給油先会社コード')
    fuel_station_code = db.Column(db.String(20), comment='給油先SSコード')
    fuel_station_name = db.Column(db.String(100), comment='給油所名')
    
    # 商品情報
    product_code = db.Column(db.String(20), comment='商品コード')
    product_name = db.Column(db.String(100), comment='商品名')
    quantity = db.Column(db.Numeric(10, 2), nullable=False, comment='数量（リットル）')
    unit_price = db.Column(db.Numeric(10, 2), nullable=False, comment='単価')
    product_amount = db.Column(db.Integer, comment='商品代')
    consumption_tax = db.Column(db.Integer, comment='参考消費税')
    diesel_tax = db.Column(db.Integer, comment='軽油税')
    
    # 伝票情報
    voucher_number = db.Column(db.String(20), comment='伝票番号')
    line_number = db.Column(db.Integer, comment='行番号')
    
    # システム項目
    created_at = db.Column(db.DateTime, default=datetime.now, comment='作成日時')
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now, comment='更新日時')
    import_batch_id = db.Column(db.String(50), comment='インポートバッチID')

    def __repr__(self):
        return f'<KitasekiRecord {self.transaction_date} {self.vehicle_number} {self.quantity}L>'

    @classmethod
    def from_csv_row(cls, row_data):
        """CSVの行データからモデルインスタンスを作成"""
        
        # デバッグ用：受信したデータを表示
        if current_app:
            current_app.logger.debug(f"CSVデータ: {row_data}")
        
        # 日付の変換（YYYYMMDD形式からdate型へ）
        date_str = str(row_data.get('取引年月日', '')).strip()
        transaction_date = None
        if date_str:
            try:
                if len(date_str) == 8:
                    year = int(date_str[:4])
                    month = int(date_str[4:6])
                    day = int(date_str[6:8])
                    transaction_date = datetime(year, month, day).date()
                elif '/' in date_str:  # YYYY/MM/DD形式の場合
                    transaction_date = datetime.strptime(date_str, '%Y/%m/%d').date()
                elif '-' in date_str:  # YYYY-MM-DD形式の場合
                    transaction_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError as e:
                if current_app:
                    current_app.logger.warning(f'日付変換エラー: {date_str} - {str(e)}')
        
        # 数値データの変換
        def safe_decimal(value, default=None):
            if value is None:
                return default
            str_val = str(value).strip()
            if not str_val or str_val == '':
                return default
            try:
                return float(str_val)
            except (ValueError, TypeError):
                return default

        def safe_int(value, default=None):
            if value is None:
                return default
            str_val = str(value).strip()
            if not str_val or str_val == '':
                return default
            try:
                return int(float(str_val))
            except (ValueError, TypeError):
                return default

        # 車番の取得（必須フィールド）
        vehicle_number = str(row_data.get('車番', '')).strip()
        if not vehicle_number:
            return None  # 車番がない場合はスキップ
        
        # 数量の取得（必須フィールド）
        quantity = safe_decimal(row_data.get('数量'))
        if quantity is None:
            return None  # 数量がない場合はスキップ
        
        # 単価の取得（必須フィールド）
        unit_price = safe_decimal(row_data.get('単価'))
        if unit_price is None:
            return None  # 単価がない場合はスキップ

        return cls(
            # 基本情報
            transaction_code=str(row_data.get('取引先コード', '')).strip() or None,
            user_code=str(row_data.get('取引先ユーザーコード', '')).strip() or None,
            customer_type=str(row_data.get('取引先親子区分', '')).strip() or None,
            transaction_date=transaction_date,
            vehicle_number=vehicle_number,
            
            # 給油所情報
            fuel_station_type=str(row_data.get('給油所区分', '')).strip() or None,
            highway_type=str(row_data.get('高速区分', '')).strip() or None,
            fuel_company_code=str(row_data.get('給油先会社コード', '')).strip() or None,
            fuel_station_code=str(row_data.get('給油先ＳＳコード', '')).strip() or None,
            fuel_station_name=str(row_data.get('給油所名', '')).strip() or None,
            
            # 商品情報
            product_code=str(row_data.get('商品コード', '')).strip() or None,
            product_name=str(row_data.get('商品名', '')).strip() or None,
            quantity=quantity,
            unit_price=unit_price,
            product_amount=safe_int(row_data.get('商品代')),
            consumption_tax=safe_int(row_data.get('参考消費税')),
            diesel_tax=safe_int(row_data.get('軽油税')),
            
            # 伝票情報
            voucher_number=str(row_data.get('伝票番号', '')).strip() or None,
            line_number=safe_int(row_data.get('行番号')),
            
            # インポートバッチID（現在の日時をベースに）
            import_batch_id=datetime.now().strftime('%Y%m%d_%H%M%S')
        )

    def to_dict(self):
        """JSONレスポンス用に辞書化"""
        return {
            "id": self.id,
            "transaction_code": self.transaction_code,
            "user_code": self.user_code,
            "customer_type": self.customer_type,
            "transaction_date": self.transaction_date.isoformat() if self.transaction_date else None,
            "vehicle_number": self.vehicle_number,
            "fuel_station_type": self.fuel_station_type,
            "highway_type": self.highway_type,
            "fuel_company_code": self.fuel_company_code,
            "fuel_station_code": self.fuel_station_code,
            "fuel_station_name": self.fuel_station_name,
            "product_code": self.product_code,
            "product_name": self.product_name,
            "quantity": float(self.quantity) if self.quantity else None,
            "unit_price": float(self.unit_price) if self.unit_price else None,
            "product_amount": self.product_amount,
            "consumption_tax": self.consumption_tax,
            "diesel_tax": self.diesel_tax,
            "voucher_number": self.voucher_number,
            "line_number": self.line_number,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "import_batch_id": self.import_batch_id
        }
    
    @property
    def is_fuel_transaction(self):
        """給油データかどうかを判定（税金調整データを除外）"""
        # 数量がプラスで、商品名に「消費税」が含まれていない場合は給油データと判定
        return (
            self.quantity is not None and 
            self.quantity > 0 and 
            self.product_name and 
            '消費税' not in self.product_name
        )

    @property
    def formatted_fuel_time(self):
        """給油時間を文字列で返す"""
        return self.fuel_time.strftime('%H:%M') if self.fuel_time else None
    

