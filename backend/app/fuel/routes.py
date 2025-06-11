# backend/app/fuel/routes.py

import os
import csv
import pandas as pd
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import func, and_, or_

from app.extensions import db
from .models import EnefleRecord, EneosWingRecord, KitasekiRecord

fuel_bp = Blueprint('fuel', __name__, url_prefix='/api/fuel')

# 許可するファイル拡張子
ALLOWED_EXTENSIONS = {'csv'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@fuel_bp.route('/enefle/upload', methods=['POST'])
def upload_enefle_csv():
    """エネフリCSVファイルのアップロードとインポート"""
    
    if 'file' not in request.files:
        return jsonify({'error': 'ファイルが選択されていません'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'ファイルが選択されていません'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'CSVファイルのみアップロード可能です'}), 400
    
    try:
        # ファイルを一時的に保存
        filename = secure_filename(file.filename)
        temp_path = os.path.join('/tmp', filename)
        file.save(temp_path)
        
        # CSVファイルの処理
        import_result = import_enefle_csv_file(temp_path)
        
        # 一時ファイルを削除
        if os.path.exists(temp_path):
            os.remove(temp_path)
        
        return jsonify(import_result), 200
        
    except Exception as e:
        current_app.logger.error(f'CSVインポートエラー: {str(e)}')
        return jsonify({'error': f'CSVインポート中にエラーが発生しました: {str(e)}'}), 500

def import_enefle_csv_file(file_path):
    """エネフリCSVファイルの実際のインポート処理"""
    
    try:
        # Shift-JISエンコーディングでCSVを読み込み
        df = pd.read_csv(file_path, encoding='shift-jis')
        
        # データの前処理
        df = df.fillna('')  # NaNを空文字に変換
        
        # 統計情報の初期化
        total_rows = len(df)
        imported_count = 0
        skipped_count = 0
        error_count = 0
        errors = []
        
        # 既存データとの重複チェック用
        existing_records = set()
        
        for index, row in df.iterrows():
            try:
                # EnefleRecordインスタンスを作成
                record = EnefleRecord.from_csv_row(row.to_dict())
                
                # 基本的なバリデーション
                if not record.transaction_date:
                    skipped_count += 1
                    continue
                
                # 重複チェック（日付、車番、伝票番号で判定）
                duplicate_key = (
                    record.transaction_date,
                    record.input_vehicle_number,
                    record.slip_number,
                    record.slip_branch_number
                )
                
                if duplicate_key in existing_records:
                    skipped_count += 1
                    continue
                
                # DBでの重複チェック
                existing = EnefleRecord.query.filter(
                    and_(
                        EnefleRecord.transaction_date == record.transaction_date,
                        EnefleRecord.input_vehicle_number == record.input_vehicle_number,
                        EnefleRecord.slip_number == record.slip_number,
                        EnefleRecord.slip_branch_number == record.slip_branch_number
                    )
                ).first()
                
                if existing:
                    skipped_count += 1
                    continue
                
                # データベースに追加
                db.session.add(record)
                existing_records.add(duplicate_key)
                imported_count += 1
                
                # バッチコミット（100件ごと）
                if imported_count % 100 == 0:
                    db.session.commit()
                    
            except Exception as e:
                error_count += 1
                error_msg = f'行 {index + 2}: {str(e)}'
                errors.append(error_msg)
                current_app.logger.warning(error_msg)
                continue
        
        # 最終コミット
        db.session.commit()
        
        return {
            'message': 'CSVインポートが完了しました',
            'total_rows': total_rows,
            'imported_count': imported_count,
            'skipped_count': skipped_count,
            'error_count': error_count,
            'errors': errors[:10]  # 最初の10件のエラーのみ返す
        }
        
    except Exception as e:
        db.session.rollback()
        raise e

@fuel_bp.route('/enefle/', methods=['GET'])
def list_enefle_records():
    """エネフリ給油データ一覧取得"""
    
    try:
        # クエリパラメータ
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 50, type=int), 100)
        vehicle_number = request.args.get('vehicle_number')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        fuel_only = request.args.get('fuel_only', 'true').lower() == 'true'
        
        # ベースクエリ
        query = EnefleRecord.query
        
        # フィルタリング
        if vehicle_number:
            query = query.filter(EnefleRecord.input_vehicle_number == vehicle_number)
        
        if start_date:
            try:
                start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
                query = query.filter(EnefleRecord.transaction_date >= start_date_obj)
            except ValueError:
                return jsonify({'error': '開始日の形式が正しくありません (YYYY-MM-DD)'}), 400
        
        if end_date:
            try:
                end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
                query = query.filter(EnefleRecord.transaction_date <= end_date_obj)
            except ValueError:
                return jsonify({'error': '終了日の形式が正しくありません (YYYY-MM-DD)'}), 400
        
        # 給油データのみに限定
        if fuel_only:
            query = query.filter(
                and_(
                    EnefleRecord.quantity > 0,
                    or_(
                        EnefleRecord.product_name.notlike('%消費税%'),
                        EnefleRecord.product_name.is_(None)
                    )
                )
            )
        
        # ソート
        query = query.order_by(EnefleRecord.transaction_date.desc(), EnefleRecord.fuel_time.desc())
        
        # ページネーション
        pagination = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        records = [record.to_dict() for record in pagination.items]
        
        return jsonify({
            'records': records,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': pagination.total,
                'pages': pagination.pages,
                'has_prev': pagination.has_prev,
                'has_next': pagination.has_next,
            }
        }), 200
        
    except Exception as e:
        current_app.logger.error(f'データ取得エラー: {str(e)}')
        return jsonify({'error': 'データ取得中にエラーが発生しました'}), 500

# ========== エネオスウィング関連API ==========

@fuel_bp.route('/eneos-wing/upload', methods=['POST'])
def upload_eneos_wing_csv():
    """エネオスウィングCSVファイルのアップロードとインポート"""
    
    if 'file' not in request.files:
        return jsonify({'error': 'ファイルが選択されていません'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'ファイルが選択されていません'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'CSVファイルのみアップロード可能です'}), 400
    
    try:
        # ファイルを一時的に保存
        filename = secure_filename(file.filename)
        temp_path = os.path.join('/tmp', filename)
        file.save(temp_path)
        
        # CSVファイルの処理
        import_result = import_eneos_wing_csv_file(temp_path)
        
        # 一時ファイルを削除
        if os.path.exists(temp_path):
            os.remove(temp_path)
        
        return jsonify(import_result), 200
        
    except Exception as e:
        current_app.logger.error(f'CSVインポートエラー: {str(e)}')
        return jsonify({'error': f'CSVインポート中にエラーが発生しました: {str(e)}'}), 500

def import_eneos_wing_csv_file(file_path):
    """エネオスウィングCSVファイルの実際のインポート処理"""
    
    try:
        # エンコーディング自動検出でCSVを読み込み
        from .encoding_utils import try_multiple_encodings
        df, successful_encoding = try_multiple_encodings(file_path)
        
        # データの前処理
        df = df.fillna('')  # NaNを空文字に変換
        
        # 統計情報の初期化
        total_rows = len(df)
        imported_count = 0
        skipped_count = 0
        error_count = 0
        errors = []
        
        # 既存データとの重複チェック用
        existing_records = set()
        
        for index, row in df.iterrows():
            try:
                # EneosWingRecordインスタンスを作成
                record = EneosWingRecord.from_csv_row(row.to_dict())
                
                # 基本的なバリデーション
                if not record.fuel_date:
                    skipped_count += 1
                    continue
                
                # 重複チェック（日付、車番、レシート番号で判定）
                duplicate_key = (
                    record.fuel_date,
                    record.vehicle_number,
                    record.receipt_number,
                    record.station_code
                )
                
                if duplicate_key in existing_records:
                    skipped_count += 1
                    continue
                
                # DBでの重複チェック
                existing = EneosWingRecord.query.filter(
                    and_(
                        EneosWingRecord.fuel_date == record.fuel_date,
                        EneosWingRecord.vehicle_number == record.vehicle_number,
                        EneosWingRecord.receipt_number == record.receipt_number,
                        EneosWingRecord.station_code == record.station_code
                    )
                ).first()
                
                if existing:
                    skipped_count += 1
                    continue
                
                # データベースに追加
                db.session.add(record)
                existing_records.add(duplicate_key)
                imported_count += 1
                
                # バッチコミット（100件ごと）
                if imported_count % 100 == 0:
                    db.session.commit()
                    
            except Exception as e:
                error_count += 1
                error_msg = f'行 {index + 2}: {str(e)}'
                errors.append(error_msg)
                current_app.logger.warning(error_msg)
                continue
        
        # 最終コミット
        db.session.commit()
        
        return {
            'message': 'CSVインポートが完了しました',
            'total_rows': total_rows,
            'imported_count': imported_count,
            'skipped_count': skipped_count,
            'error_count': error_count,
            'errors': errors[:10]  # 最初の10件のエラーのみ返す
        }
        
    except Exception as e:
        db.session.rollback()
        raise e

@fuel_bp.route('/eneos-wing/', methods=['GET'])
def list_eneos_wing_records():
    """エネオスウィング給油データ一覧取得"""
    
    try:
        # クエリパラメータ
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 50, type=int), 100)
        vehicle_number = request.args.get('vehicle_number')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        fuel_only = request.args.get('fuel_only', 'true').lower() == 'true'
        
        # ベースクエリ
        query = EneosWingRecord.query
        
        # フィルタリング
        if vehicle_number:
            query = query.filter(EneosWingRecord.vehicle_number == vehicle_number)
        
        if start_date:
            try:
                start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
                query = query.filter(EneosWingRecord.fuel_date >= start_date_obj)
            except ValueError:
                return jsonify({'error': '開始日の形式が正しくありません (YYYY-MM-DD)'}), 400
        
        if end_date:
            try:
                end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
                query = query.filter(EneosWingRecord.fuel_date <= end_date_obj)
            except ValueError:
                return jsonify({'error': '終了日の形式が正しくありません (YYYY-MM-DD)'}), 400
        
        # 給油データのみに限定
        if fuel_only:
            query = query.filter(
                and_(
                    EneosWingRecord.quantity > 0,
                    EneosWingRecord.product_category.like('11%')  # 111, 112 など燃料関係
                )
            )
        
        # ソート
        query = query.order_by(EneosWingRecord.fuel_date.desc(), EneosWingRecord.fuel_time.desc())
        
        # ページネーション
        pagination = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        records = [record.to_dict() for record in pagination.items]
        
        return jsonify({
            'records': records,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': pagination.total,
                'pages': pagination.pages,
                'has_prev': pagination.has_prev,
                'has_next': pagination.has_next,
            }
        }), 200
        
    except Exception as e:
        current_app.logger.error(f'データ取得エラー: {str(e)}')
        return jsonify({'error': 'データ取得中にエラーが発生しました'}), 500

@fuel_bp.route('/eneos-wing/summary', methods=['GET'])
def eneos_wing_summary():
    """エネオスウィング給油データの統計情報"""
    
    try:
        # 期間指定
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # ベースクエリ（給油データのみ）
        query = EneosWingRecord.query.filter(
            and_(
                EneosWingRecord.quantity > 0,
                EneosWingRecord.product_category.like('11%')
            )
        )
        
        # 期間フィルタ
        if start_date:
            start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
            query = query.filter(EneosWingRecord.fuel_date >= start_date_obj)
        
        if end_date:
            end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
            query = query.filter(EneosWingRecord.fuel_date <= end_date_obj)
        
        # 統計計算
        summary_data = query.with_entities(
            func.count(EneosWingRecord.id).label('total_transactions'),
            func.sum(EneosWingRecord.quantity).label('total_liters'),
            func.sum(EneosWingRecord.total_amount).label('total_amount'),
            func.avg(EneosWingRecord.unit_price_with_tax).label('avg_unit_price'),
            func.count(func.distinct(EneosWingRecord.vehicle_number)).label('unique_vehicles')
        ).first()
        
        # 車両別統計
        vehicle_stats = query.with_entities(
            EneosWingRecord.vehicle_number,
            func.count(EneosWingRecord.id).label('transaction_count'),
            func.sum(EneosWingRecord.quantity).label('total_liters'),
            func.sum(EneosWingRecord.total_amount).label('total_amount')
        ).group_by(EneosWingRecord.vehicle_number)\
         .order_by(func.sum(EneosWingRecord.total_amount).desc())\
         .limit(10).all()
        
        return jsonify({
            'summary': {
                'total_transactions': summary_data.total_transactions or 0,
                'total_liters': float(summary_data.total_liters or 0),
                'total_amount': float(summary_data.total_amount or 0),
                'avg_unit_price': float(summary_data.avg_unit_price or 0),
                'unique_vehicles': summary_data.unique_vehicles or 0
            },
            'top_vehicles': [
                {
                    'vehicle_number': stat.vehicle_number,
                    'transaction_count': stat.transaction_count,
                    'total_liters': float(stat.total_liters or 0),
                    'total_amount': float(stat.total_amount or 0)
                }
                for stat in vehicle_stats
            ]
        }), 200
        
    except Exception as e:
        current_app.logger.error(f'統計データ取得エラー: {str(e)}')
        return jsonify({'error': '統計データ取得中にエラーが発生しました'}), 500


@fuel_bp.route('/enefle/summary', methods=['GET'])
def enefle_summary():
    """エネフリ給油データの統計情報"""
    
    try:
        # 期間指定
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # ベースクエリ（給油データのみ）
        query = EnefleRecord.query.filter(
            and_(
                EnefleRecord.quantity > 0,
                or_(
                    EnefleRecord.product_name.notlike('%消費税%'),
                    EnefleRecord.product_name.is_(None)
                )
            )
        )
        
        # 期間フィルタ
        if start_date:
            start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
            query = query.filter(EnefleRecord.transaction_date >= start_date_obj)
        
        if end_date:
            end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
            query = query.filter(EnefleRecord.transaction_date <= end_date_obj)
        
        # 統計計算
        summary_data = query.with_entities(
            func.count(EnefleRecord.id).label('total_transactions'),
            func.sum(EnefleRecord.quantity).label('total_liters'),
            func.sum(EnefleRecord.total_amount).label('total_amount'),
            func.avg(EnefleRecord.unit_price).label('avg_unit_price'),
            func.count(func.distinct(EnefleRecord.input_vehicle_number)).label('unique_vehicles')
        ).first()
        
        # 車両別統計
        vehicle_stats = query.with_entities(
            EnefleRecord.input_vehicle_number,
            func.count(EnefleRecord.id).label('transaction_count'),
            func.sum(EnefleRecord.quantity).label('total_liters'),
            func.sum(EnefleRecord.total_amount).label('total_amount')
        ).group_by(EnefleRecord.input_vehicle_number)\
         .order_by(func.sum(EnefleRecord.total_amount).desc())\
         .limit(10).all()
        
        return jsonify({
            'summary': {
                'total_transactions': summary_data.total_transactions or 0,
                'total_liters': float(summary_data.total_liters or 0),
                'total_amount': float(summary_data.total_amount or 0),
                'avg_unit_price': float(summary_data.avg_unit_price or 0),
                'unique_vehicles': summary_data.unique_vehicles or 0
            },
            'top_vehicles': [
                {
                    'vehicle_number': stat.input_vehicle_number,
                    'transaction_count': stat.transaction_count,
                    'total_liters': float(stat.total_liters or 0),
                    'total_amount': float(stat.total_amount or 0)
                }
                for stat in vehicle_stats
            ]
        }), 200
        
    except Exception as e:
        current_app.logger.error(f'統計データ取得エラー: {str(e)}')
        return jsonify({'error': '統計データ取得中にエラーが発生しました'}), 500

@fuel_bp.route('/enefle/<int:record_id>', methods=['GET'])
def get_enefle_record(record_id):
    """特定のエネフリ給油データ取得"""
    
    try:
        record = EnefleRecord.query.get_or_404(record_id)
        return jsonify(record.to_dict()), 200
        
    except Exception as e:
        current_app.logger.error(f'データ取得エラー: {str(e)}')
        return jsonify({'error': 'データ取得中にエラーが発生しました'}), 500

@fuel_bp.route('/enefle/<int:record_id>', methods=['DELETE'])
def delete_enefle_record(record_id):
    """エネフリ給油データの削除"""
    
    try:
        record = EnefleRecord.query.get_or_404(record_id)
        db.session.delete(record)
        db.session.commit()
        
        return jsonify({'message': 'データを削除しました'}), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f'データ削除エラー: {str(e)}')
        return jsonify({'error': 'データ削除中にエラーが発生しました'}), 500

# ========== キタセキ社関連API ==========

@fuel_bp.route('/kitaseki/upload', methods=['POST'])
def upload_kitaseki_csv():
    """キタセキ社CSVファイルのアップロードとインポート"""
    
    if 'file' not in request.files:
        return jsonify({'error': 'ファイルが選択されていません'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'ファイルが選択されていません'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'CSVファイルのみアップロード可能です'}), 400
    
    try:
        # ファイルを一時的に保存
        filename = secure_filename(file.filename)
        temp_path = os.path.join('/tmp', filename)
        file.save(temp_path)
        
        # CSVファイルの処理
        import_result = import_kitaseki_csv_file(temp_path)
        
        # 一時ファイルを削除
        if os.path.exists(temp_path):
            os.remove(temp_path)
        
        return jsonify(import_result), 200
        
    except Exception as e:
        current_app.logger.error(f'CSVインポートエラー: {str(e)}')
        return jsonify({'error': f'CSVインポート中にエラーが発生しました: {str(e)}'}), 500

def import_kitaseki_csv_file(file_path):
    """キタセキ社CSVファイルの実際のインポート処理"""
    
    try:
        # Shift-JISエンコーディングでCSVを読み込み
        df = pd.read_csv(file_path, encoding='shift-jis')
        
        # データの前処理
        df = df.fillna('')  # NaNを空文字に変換
        
        # 統計情報の初期化
        total_rows = len(df)
        imported_count = 0
        skipped_count = 0
        error_count = 0
        errors = []
        
        # 既存データとの重複チェック用
        existing_records = set()
        
        for index, row in df.iterrows():
            try:
                # KitasekiRecordインスタンスを作成
                record = KitasekiRecord.from_csv_row(row.to_dict())
                
                # 基本的なバリデーション
                if not record or not record.transaction_date or not record.vehicle_number:
                    skipped_count += 1
                    continue
                
                # 重複チェック（日付、車番、伝票番号、行番号で判定）
                duplicate_key = (
                    record.transaction_date,
                    record.vehicle_number,
                    record.voucher_number,
                    record.line_number
                )
                
                if duplicate_key in existing_records:
                    skipped_count += 1
                    continue
                
                # DBでの重複チェック
                existing = KitasekiRecord.query.filter(
                    and_(
                        KitasekiRecord.transaction_date == record.transaction_date,
                        KitasekiRecord.vehicle_number == record.vehicle_number,
                        KitasekiRecord.voucher_number == record.voucher_number,
                        KitasekiRecord.line_number == record.line_number
                    )
                ).first()
                
                if existing:
                    skipped_count += 1
                    continue
                
                # インポートバッチIDを設定（現在の日時をベースに）
                if not record.import_batch_id:
                    record.import_batch_id = datetime.now().strftime('%Y%m%d_%H%M%S')
                
                # データベースに追加
                db.session.add(record)
                existing_records.add(duplicate_key)
                imported_count += 1
                
                # バッチコミット（100件ごと）
                if imported_count % 100 == 0:
                    db.session.commit()
                    
            except Exception as e:
                error_count += 1
                error_msg = f'行 {index + 2}: {str(e)}'
                errors.append(error_msg)
                current_app.logger.warning(error_msg)
                continue
        
        # 最終コミット
        db.session.commit()
        
        return {
            'message': 'CSVインポートが完了しました',
            'total_rows': total_rows,
            'imported_count': imported_count,
            'skipped_count': skipped_count,
            'error_count': error_count,
            'errors': errors[:10]  # 最初の10件のエラーのみ返す
        }
        
    except Exception as e:
        db.session.rollback()
        raise e

@fuel_bp.route('/kitaseki/', methods=['GET'])
def list_kitaseki_records():
    """キタセキ社給油データ一覧取得"""
    
    try:
        # クエリパラメータ
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 50, type=int), 100)
        vehicle_number = request.args.get('vehicle_number')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        fuel_only = request.args.get('fuel_only', 'true').lower() == 'true'
        
        # ベースクエリ
        query = KitasekiRecord.query
        
        # フィルタリング
        if vehicle_number:
            query = query.filter(KitasekiRecord.vehicle_number == vehicle_number)
        
        if start_date:
            try:
                start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
                query = query.filter(KitasekiRecord.transaction_date >= start_date_obj)
            except ValueError:
                return jsonify({'error': '開始日の形式が正しくありません (YYYY-MM-DD)'}), 400
        
        if end_date:
            try:
                end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
                query = query.filter(KitasekiRecord.transaction_date <= end_date_obj)
            except ValueError:
                return jsonify({'error': '終了日の形式が正しくありません (YYYY-MM-DD)'}), 400
        
        # 給油データのみに限定（数量がプラスで、消費税調整データではない）
        if fuel_only:
            query = query.filter(
                and_(
                    KitasekiRecord.quantity > 0,
                    or_(
                        KitasekiRecord.product_name.notlike('%消費税%'),
                        KitasekiRecord.product_name.is_(None)
                    )
                )
            )
        
        # ソート
        query = query.order_by(KitasekiRecord.transaction_date.desc(), KitasekiRecord.vehicle_number)
        
        # ページネーション
        pagination = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        records = [record.to_dict() for record in pagination.items]
        
        return jsonify({
            'records': records,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': pagination.total,
                'pages': pagination.pages,
                'has_prev': pagination.has_prev,
                'has_next': pagination.has_next,
            }
        }), 200
        
    except Exception as e:
        current_app.logger.error(f'データ取得エラー: {str(e)}')
        return jsonify({'error': 'データ取得中にエラーが発生しました'}), 500

@fuel_bp.route('/kitaseki/summary', methods=['GET'])
def kitaseki_summary():
    """キタセキ社給油データの統計情報"""
    
    try:
        # 期間指定
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # ベースクエリ（給油データのみ）
        query = KitasekiRecord.query.filter(
            and_(
                KitasekiRecord.quantity > 0,
                or_(
                    KitasekiRecord.product_name.notlike('%消費税%'),
                    KitasekiRecord.product_name.is_(None)
                )
            )
        )
        
        # 期間フィルタ
        if start_date:
            start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
            query = query.filter(KitasekiRecord.transaction_date >= start_date_obj)
        
        if end_date:
            end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
            query = query.filter(KitasekiRecord.transaction_date <= end_date_obj)
        
        # 統計計算
        summary_data = query.with_entities(
            func.count(KitasekiRecord.id).label('total_transactions'),
            func.sum(KitasekiRecord.quantity).label('total_liters'),
            func.sum(KitasekiRecord.product_amount).label('total_amount'),
            func.avg(KitasekiRecord.unit_price).label('avg_unit_price'),
            func.count(func.distinct(KitasekiRecord.vehicle_number)).label('unique_vehicles')
        ).first()
        
        # 車両別統計
        vehicle_stats = query.with_entities(
            KitasekiRecord.vehicle_number,
            func.count(KitasekiRecord.id).label('transaction_count'),
            func.sum(KitasekiRecord.quantity).label('total_liters'),
            func.sum(KitasekiRecord.product_amount).label('total_amount')
        ).group_by(KitasekiRecord.vehicle_number)\
         .order_by(func.sum(KitasekiRecord.product_amount).desc())\
         .limit(10).all()
        
        # 給油所別統計
        station_stats = query.with_entities(
            KitasekiRecord.fuel_station_name,
            func.count(KitasekiRecord.id).label('transaction_count'),
            func.sum(KitasekiRecord.quantity).label('total_liters'),
            func.sum(KitasekiRecord.product_amount).label('total_amount')
        ).group_by(KitasekiRecord.fuel_station_name)\
         .order_by(func.sum(KitasekiRecord.product_amount).desc())\
         .limit(10).all()
        
        return jsonify({
            'summary': {
                'total_transactions': summary_data.total_transactions or 0,
                'total_liters': float(summary_data.total_liters or 0),
                'total_amount': float(summary_data.total_amount or 0),
                'avg_unit_price': float(summary_data.avg_unit_price or 0),
                'unique_vehicles': summary_data.unique_vehicles or 0
            },
            'top_vehicles': [
                {
                    'vehicle_number': stat.vehicle_number,
                    'transaction_count': stat.transaction_count,
                    'total_liters': float(stat.total_liters or 0),
                    'total_amount': float(stat.total_amount or 0)
                }
                for stat in vehicle_stats
            ],
            'top_stations': [
                {
                    'station_name': stat.fuel_station_name,
                    'transaction_count': stat.transaction_count,
                    'total_liters': float(stat.total_liters or 0),
                    'total_amount': float(stat.total_amount or 0)
                }
                for stat in station_stats
            ]
        }), 200
        
    except Exception as e:
        current_app.logger.error(f'統計データ取得エラー: {str(e)}')
        return jsonify({'error': '統計データ取得中にエラーが発生しました'}), 500

@fuel_bp.route('/kitaseki/<int:record_id>', methods=['GET'])
def get_kitaseki_record(record_id):
    """特定のキタセキ社給油データ取得"""
    
    try:
        record = KitasekiRecord.query.get_or_404(record_id)
        return jsonify(record.to_dict()), 200
        
    except Exception as e:
        current_app.logger.error(f'データ取得エラー: {str(e)}')
        return jsonify({'error': 'データ取得中にエラーが発生しました'}), 500

@fuel_bp.route('/kitaseki/<int:record_id>', methods=['DELETE'])
def delete_kitaseki_record(record_id):
    """キタセキ社給油データの削除"""
    
    try:
        record = KitasekiRecord.query.get_or_404(record_id)
        db.session.delete(record)
        db.session.commit()
        
        return jsonify({'message': 'データを削除しました'}), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f'データ削除エラー: {str(e)}')
        return jsonify({'error': 'データ削除中にエラーが発生しました'}), 500

@fuel_bp.route('/kitaseki/vehicles', methods=['GET'])
def list_kitaseki_vehicles():
    """キタセキ社データに含まれる車両一覧取得"""
    
    try:
        vehicles = db.session.query(
            KitasekiRecord.vehicle_number,
            func.count(KitasekiRecord.id).label('record_count'),
            func.max(KitasekiRecord.transaction_date).label('latest_date'),
            func.sum(KitasekiRecord.quantity).label('total_liters'),
            func.sum(KitasekiRecord.product_amount).label('total_amount')
        ).group_by(KitasekiRecord.vehicle_number)\
         .order_by(KitasekiRecord.vehicle_number).all()
        
        return jsonify([
            {
                'vehicle_number': vehicle.vehicle_number,
                'record_count': vehicle.record_count,
                'latest_date': vehicle.latest_date.isoformat() if vehicle.latest_date else None,
                'total_liters': float(vehicle.total_liters or 0),
                'total_amount': float(vehicle.total_amount or 0)
            }
            for vehicle in vehicles
        ]), 200
        
    except Exception as e:
        current_app.logger.error(f'車両一覧取得エラー: {str(e)}')
        return jsonify({'error': '車両一覧取得中にエラーが発生しました'}), 500
    
@fuel_bp.route('/summary', methods=['GET'])
def combined_fuel_summary():
    """全社合計の給油データ統計（エネフレ + エネオスウィング + キタセキ）"""
    
    try:
        # 期間指定
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # エネフレデータの統計
        enefle_query = EnefleRecord.query.filter(
            and_(
                EnefleRecord.quantity > 0,
                or_(
                    EnefleRecord.product_name.notlike('%消費税%'),
                    EnefleRecord.product_name.is_(None)
                )
            )
        )
        
        # エネオスウィングデータの統計
        eneos_query = EneosWingRecord.query.filter(
            and_(
                EneosWingRecord.quantity > 0,
                EneosWingRecord.product_category.like('11%')
            )
        )
        
        # キタセキ社データの統計
        kitaseki_query = KitasekiRecord.query.filter(
            and_(
                KitasekiRecord.quantity > 0,
                or_(
                    KitasekiRecord.product_name.notlike('%消費税%'),
                    KitasekiRecord.product_name.is_(None)
                )
            )
        )
        
        # 期間フィルタ適用
        if start_date:
            start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
            enefle_query = enefle_query.filter(EnefleRecord.transaction_date >= start_date_obj)
            eneos_query = eneos_query.filter(EneosWingRecord.fuel_date >= start_date_obj)
            kitaseki_query = kitaseki_query.filter(KitasekiRecord.transaction_date >= start_date_obj)
        
        if end_date:
            end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
            enefle_query = enefle_query.filter(EnefleRecord.transaction_date <= end_date_obj)
            eneos_query = eneos_query.filter(EneosWingRecord.fuel_date <= end_date_obj)
            kitaseki_query = kitaseki_query.filter(KitasekiRecord.transaction_date <= end_date_obj)
        
        # エネフレ統計
        enefle_stats = enefle_query.with_entities(
            func.count(EnefleRecord.id).label('count'),
            func.sum(EnefleRecord.quantity).label('liters'),
            func.sum(EnefleRecord.total_amount).label('amount')
        ).first()
        
        # エネオスウィング統計
        eneos_stats = eneos_query.with_entities(
            func.count(EneosWingRecord.id).label('count'),
            func.sum(EneosWingRecord.quantity).label('liters'),
            func.sum(EneosWingRecord.total_amount).label('amount')
        ).first()
        
        # キタセキ統計
        kitaseki_stats = kitaseki_query.with_entities(
            func.count(KitasekiRecord.id).label('count'),
            func.sum(KitasekiRecord.quantity).label('liters'),
            func.sum(KitasekiRecord.product_amount).label('amount')
        ).first()
        
        # 車両別合計統計（上位10車両）
        # 各テーブルから車両別データを取得して統合
        enefle_vehicles = enefle_query.with_entities(
            EnefleRecord.input_vehicle_number.label('vehicle_number'),
            func.sum(EnefleRecord.quantity).label('liters'),
            func.sum(EnefleRecord.total_amount).label('amount')
        ).group_by(EnefleRecord.input_vehicle_number).all()
        
        eneos_vehicles = eneos_query.with_entities(
            EneosWingRecord.vehicle_number,
            func.sum(EneosWingRecord.quantity).label('liters'),
            func.sum(EneosWingRecord.total_amount).label('amount')
        ).group_by(EneosWingRecord.vehicle_number).all()
        
        kitaseki_vehicles = kitaseki_query.with_entities(
            KitasekiRecord.vehicle_number,
            func.sum(KitasekiRecord.quantity).label('liters'),
            func.sum(KitasekiRecord.product_amount).label('amount')
        ).group_by(KitasekiRecord.vehicle_number).all()
        
        # 車両別データを統合
        vehicle_totals = {}
        
        for vehicle in enefle_vehicles:
            if vehicle.vehicle_number:
                vehicle_totals[vehicle.vehicle_number] = {
                    'liters': float(vehicle.liters or 0),
                    'amount': float(vehicle.amount or 0)
                }
        
        for vehicle in eneos_vehicles:
            if vehicle.vehicle_number:
                if vehicle.vehicle_number in vehicle_totals:
                    vehicle_totals[vehicle.vehicle_number]['liters'] += float(vehicle.liters or 0)
                    vehicle_totals[vehicle.vehicle_number]['amount'] += float(vehicle.amount or 0)
                else:
                    vehicle_totals[vehicle.vehicle_number] = {
                        'liters': float(vehicle.liters or 0),
                        'amount': float(vehicle.amount or 0)
                    }
        
        for vehicle in kitaseki_vehicles:
            if vehicle.vehicle_number:
                if vehicle.vehicle_number in vehicle_totals:
                    vehicle_totals[vehicle.vehicle_number]['liters'] += float(vehicle.liters or 0)
                    vehicle_totals[vehicle.vehicle_number]['amount'] += float(vehicle.amount or 0)
                else:
                    vehicle_totals[vehicle.vehicle_number] = {
                        'liters': float(vehicle.liters or 0),
                        'amount': float(vehicle.amount or 0)
                    }
        
        # 上位10車両を金額順でソート
        top_vehicles = sorted(
            [
                {
                    'vehicle_number': vehicle_number,
                    'total_liters': data['liters'],
                    'total_amount': data['amount']
                }
                for vehicle_number, data in vehicle_totals.items()
            ],
            key=lambda x: x['total_amount'],
            reverse=True
        )[:10]
        
        return jsonify({
            'combined_summary': {
                'total_transactions': (enefle_stats.count or 0) + (eneos_stats.count or 0) + (kitaseki_stats.count or 0),
                'total_liters': float((enefle_stats.liters or 0) + (eneos_stats.liters or 0) + (kitaseki_stats.liters or 0)),
                'total_amount': float((enefle_stats.amount or 0) + (eneos_stats.amount or 0) + (kitaseki_stats.amount or 0))
            },
            'by_company': {
                'enefle': {
                    'transactions': enefle_stats.count or 0,
                    'liters': float(enefle_stats.liters or 0),
                    'amount': float(enefle_stats.amount or 0)
                },
                'eneos_wing': {
                    'transactions': eneos_stats.count or 0,
                    'liters': float(eneos_stats.liters or 0),
                    'amount': float(eneos_stats.amount or 0)
                },
                'kitaseki': {
                    'transactions': kitaseki_stats.count or 0,
                    'liters': float(kitaseki_stats.liters or 0),
                    'amount': float(kitaseki_stats.amount or 0)
                }
            },
            'top_vehicles': top_vehicles
        }), 200
        
    except Exception as e:
        current_app.logger.error(f'統合統計データ取得エラー: {str(e)}')
        return jsonify({'error': '統合統計データ取得中にエラーが発生しました'}), 500


    