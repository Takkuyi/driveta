# app/maintenance/routes.py

from flask import Blueprint, jsonify, request, current_app
from werkzeug.utils import secure_filename
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime, timedelta
import os
import uuid
from supabase import create_client, Client

from app.extensions import db
from app.vehicle.models import Vehicles
from app.maintenance.models import MaintenanceType, MaintenanceStatus, MaintenanceSchedule, MaintenanceDetail, MaintenanceFile
#from app.utils.supabase import upload_to_supabase, delete_from_supabase, get_file_url


# Supabaseクライアントの初期化
#supabase_url = os.environ.get("SUPABASE_URL")
#supabase_key = os.environ.get("SUPABASE_KEY")
#supabase: Client = create_client(supabase_url, supabase_key)

# ブループリント定義
maintenance_bp = Blueprint('maintenance', __name__, url_prefix='/api/maintenance')

# 点検種類一覧取得
@maintenance_bp.route('/types/', methods=['GET'])
def list_maintenance_types():
    types = MaintenanceType.query.filter_by(is_active=True).all()
    return jsonify([{
        'id': t.id,
        'name': t.name,
        'description': t.description,
        'cycle_months': t.cycle_months
    } for t in types])


# 整備状態一覧取得
@maintenance_bp.route('/statuses/', methods=['GET'])
def list_maintenance_statuses():
    statuses = MaintenanceStatus.query.all()
    return jsonify([{
        'id': s.id,
        'name': s.name,
        'description': s.description,
        'color_code': s.color_code
    } for s in statuses])


# 点検予定/実績一覧取得
@maintenance_bp.route('/schedules/', methods=['GET'])
def list_maintenance_schedules():
    # クエリパラメータの取得
    vehicle_id = request.args.get('vehicle_id', type=int)
    maintenance_type_id = request.args.get('maintenance_type_id', type=int)
    status_id = request.args.get('status_id', type=int)
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    # クエリビルダー
    query = MaintenanceSchedule.query
    
    # フィルタリング
    if vehicle_id:
        query = query.filter_by(vehicle_id=vehicle_id)
    if maintenance_type_id:
        query = query.filter_by(maintenance_type_id=maintenance_type_id)
    if status_id:
        query = query.filter_by(status_id=status_id)
    if start_date:
        try:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            query = query.filter(MaintenanceSchedule.scheduled_date >= start_date)
        except ValueError:
            pass
    if end_date:
        try:
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
            query = query.filter(MaintenanceSchedule.scheduled_date <= end_date)
        except ValueError:
            pass
    
    # 整備予定の取得（日付の新しい順）
    schedules = query.order_by(MaintenanceSchedule.scheduled_date.desc()).all()
    
    # レスポンスデータの構築
    result = []
    for schedule in schedules:
        # 車両情報の取得
        vehicle = schedule.vehicle
        
        schedule_data = {
            'id': schedule.id,
            'vehicle_id': schedule.vehicle_id,
            'vehicle_info': {
                'plate': vehicle.自動車登録番号および車両番号 if hasattr(vehicle, '自動車登録番号および車両番号') else None,
                'number': vehicle.型式 if hasattr(vehicle, '型式') else None,
                'manufacturer': vehicle.車名 if hasattr(vehicle, '車名') else None
            },
            'maintenance_type': {
                'id': schedule.maintenance_type_id,
                'name': schedule.maintenance_type.name
            },
            'status': {
                'id': schedule.status_id,
                'name': schedule.status.name,
                'color_code': schedule.status.color_code
            },
            'scheduled_date': schedule.scheduled_date.isoformat() if schedule.scheduled_date else None,
            'completion_date': schedule.completion_date.isoformat() if schedule.completion_date else None,
            'technician': schedule.technician,
            'location': schedule.location,
            'cost': float(schedule.cost) if schedule.cost else None,
            'notes': schedule.notes,
            'created_at': schedule.created_at.isoformat(),
            'updated_at': schedule.updated_at.isoformat()
        }
        result.append(schedule_data)
    
    return jsonify(result)


# 車両別の点検予定/実績一覧取得
@maintenance_bp.route('/vehicles/<int:vehicle_id>/schedules/', methods=['GET'])
def list_vehicle_maintenance_schedules(vehicle_id):
    # 車両が存在するか確認
    vehicle = Vehicles.query.get_or_404(vehicle_id)
    
    # 車両の点検予定/実績を取得
    schedules = MaintenanceSchedule.query.filter_by(vehicle_id=vehicle_id).order_by(MaintenanceSchedule.scheduled_date.desc()).all()
    
    result = []
    for schedule in schedules:
        schedule_data = {
            'id': schedule.id,
            'maintenance_type': {
                'id': schedule.maintenance_type_id,
                'name': schedule.maintenance_type.name
            },
            'status': {
                'id': schedule.status_id,
                'name': schedule.status.name,
                'color_code': schedule.status.color_code
            },
            'scheduled_date': schedule.scheduled_date.isoformat() if schedule.scheduled_date else None,
            'completion_date': schedule.completion_date.isoformat() if schedule.completion_date else None,
            'technician': schedule.technician,
            'location': schedule.location,
            'cost': float(schedule.cost) if schedule.cost else None,
            'notes': schedule.notes
        }
        result.append(schedule_data)
    
    return jsonify(result)


# 点検予定/実績詳細取得
@maintenance_bp.route('/schedules/<int:schedule_id>/', methods=['GET'])
def get_maintenance_schedule(schedule_id):
    # 整備予定の取得
    schedule = MaintenanceSchedule.query.get_or_404(schedule_id)
    
    # 車両情報の取得
    vehicle = schedule.vehicle
    
    # 詳細情報の取得
    details = MaintenanceDetail.query.filter_by(maintenance_schedule_id=schedule_id).all()
    
    # ファイル情報の取得
    files = MaintenanceFile.query.filter_by(maintenance_schedule_id=schedule_id).all()
    
    # レスポンスデータの構築
    schedule_data = {
        'id': schedule.id,
        'vehicle_id': schedule.vehicle_id,
        'vehicle_info': {
            'plate': vehicle.自動車登録番号および車両番号 if hasattr(vehicle, '自動車登録番号および車両番号') else None,
            'number': vehicle.型式 if hasattr(vehicle, '型式') else None,
            'manufacturer': vehicle.車名 if hasattr(vehicle, '車名') else None
        },
        'maintenance_type': {
            'id': schedule.maintenance_type_id,
            'name': schedule.maintenance_type.name
        },
        'status': {
            'id': schedule.status_id,
            'name': schedule.status.name,
            'color_code': schedule.status.color_code
        },
        'scheduled_date': schedule.scheduled_date.isoformat() if schedule.scheduled_date else None,
        'completion_date': schedule.completion_date.isoformat() if schedule.completion_date else None,
        'technician': schedule.technician, #レガシーサポートとして残す
        'location': schedule.location,
        'cost': float(schedule.cost) if schedule.cost else None,
        'notes': schedule.notes,
        'created_at': schedule.created_at.isoformat(),
        'updated_at': schedule.updated_at.isoformat(),
        'details': [{
            'id': detail.id,
            'item_name': detail.item_name,
            'result': detail.result,
            'is_ok': detail.is_ok,
            'action_taken': detail.action_taken,
            'parts_used': detail.parts_used,
            'parts_cost': float(detail.parts_cost) if detail.parts_cost else None,
            'notes': detail.notes
        } for detail in details],
        'files': [{
            'id': file.id,
            'file_name': file.file_name,
            'file_path': file.file_path,
            'file_type': file.file_type,
            'file_size': file.file_size,
            'description': file.description,
            'uploaded_by': file.uploaded_by,
            'created_at': file.created_at.isoformat()
        } for file in files]
    }
    
    # 担当者情報を追加 - 新しいコード部分
    if schedule.technician_id and schedule.technician_employee:
        schedule_data['technician_employee'] = {
            'id': schedule.technician_employee.id,
            'employee_code': schedule.technician_employee.employee_code,
            'full_name': schedule.technician_employee.full_name,
            'department': schedule.technician_employee.department
        }
        
    
    return jsonify(schedule_data)


# 点検予定/実績の登録
@maintenance_bp.route('/schedules/', methods=['POST'])
def create_maintenance_schedule():
    data = request.json
    
    # 必須フィールドの検証
    required_fields = ['vehicle_id', 'maintenance_type_id', 'scheduled_date', 'status_id']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'必須フィールド "{field}" がありません'}), 400
    
    try:
        # 日付の変換
        scheduled_date = datetime.strptime(data['scheduled_date'], '%Y-%m-%d').date()
        completion_date = None
        if 'completion_date' in data and data['completion_date']:
            completion_date = datetime.strptime(data['completion_date'], '%Y-%m-%d').date()
        
        # 新しい点検予定の作成
        new_schedule = MaintenanceSchedule(
            vehicle_id=data['vehicle_id'],
            maintenance_type_id=data['maintenance_type_id'],
            scheduled_date=scheduled_date,
            completion_date=completion_date,
            status_id=data['status_id'],
            location=data.get('location'),
            cost=data.get('cost'),
            notes=data.get('notes')
        )
        
        # 担当者の設定　
        if 'technician_id' in data:
            new_schedule.technician = data['technician_id']
        elif 'technician' in data:
            new_schedule.technician = data['technician']
        
        db.session.add(new_schedule)
        db.session.commit()
        
        # 詳細情報の登録（存在する場合）
        if 'details' in data and isinstance(data['details'], list):
            for detail_data in data['details']:
                detail = MaintenanceDetail(
                    maintenance_schedule_id=new_schedule.id,
                    item_name=detail_data['item_name'],
                    result=detail_data.get('result'),
                    is_ok=detail_data.get('is_ok'),
                    action_taken=detail_data.get('action_taken'),
                    parts_used=detail_data.get('parts_used'),
                    parts_cost=detail_data.get('parts_cost'),
                    notes=detail_data.get('notes')
                )
                db.session.add(detail)
            
            db.session.commit()
        
        return jsonify({
            'id': new_schedule.id,
            'message': '点検予定を登録しました'
        }), 201



    except ValueError as e:
        return jsonify({'error': f'日付形式が正しくありません: {str(e)}'}), 400
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({'error': f'データベースエラー: {str(e)}'}), 500


# 点検予定/実績の更新
@maintenance_bp.route('/schedules/<int:schedule_id>/', methods=['PUT', 'PATCH'])
def update_maintenance_schedule(schedule_id):
    # 整備予定の取得
    schedule = MaintenanceSchedule.query.get_or_404(schedule_id)
    
    data = request.json
    
    try:
        # 更新するフィールドの設定
        if 'vehicle_id' in data:
            schedule.vehicle_id = data['vehicle_id']
        if 'maintenance_type_id' in data:
            schedule.maintenance_type_id = data['maintenance_type_id']
        if 'status_id' in data:
            schedule.status_id = data['status_id']
        if 'scheduled_date' in data:
            schedule.scheduled_date = datetime.strptime(data['scheduled_date'], '%Y-%m-%d').date()
        if 'completion_date' in data:
            if data['completion_date']:
                schedule.completion_date = datetime.strptime(data['completion_date'], '%Y-%m-%d').date()
            else:
                schedule.completion_date = None

        # 担当者の更新 - 新しいコード部分
        if 'technician_id' in data:
            schedule.technician_id = data['technician_id']
        elif 'technician' in data:
            schedule.technician = data['technician']

        if 'location' in data:
            schedule.location = data['location']
        if 'cost' in data:
            schedule.cost = data['cost']
        if 'notes' in data:
            schedule.notes = data['notes']
        
        # 詳細情報の更新（存在する場合）
        if 'details' in data and isinstance(data['details'], list):
            # 既存の詳細情報を削除
            MaintenanceDetail.query.filter_by(maintenance_schedule_id=schedule_id).delete()
            
            # 新しい詳細情報を追加
            for detail_data in data['details']:
                detail = MaintenanceDetail(
                    maintenance_schedule_id=schedule_id,
                    item_name=detail_data['item_name'],
                    result=detail_data.get('result'),
                    is_ok=detail_data.get('is_ok'),
                    action_taken=detail_data.get('action_taken'),
                    parts_used=detail_data.get('parts_used'),
                    parts_cost=detail_data.get('parts_cost'),
                    notes=detail_data.get('notes')
                )
                db.session.add(detail)
        
        db.session.commit()
        
        return jsonify({
            'id': schedule.id,
            'message': '点検予定を更新しました'
        })
        
    except ValueError as e:
        return jsonify({'error': f'日付形式が正しくありません: {str(e)}'}), 400
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({'error': f'データベースエラー: {str(e)}'}), 500


# 点検予定/実績の削除
@maintenance_bp.route('/schedules/<int:schedule_id>/', methods=['DELETE'])
def delete_maintenance_schedule(schedule_id):
    # 整備予定の取得
    schedule = MaintenanceSchedule.query.get_or_404(schedule_id)
    
    try:
        # 関連する詳細情報を削除
        MaintenanceDetail.query.filter_by(maintenance_schedule_id=schedule_id).delete()
        
        # ファイル情報の取得
        files = MaintenanceFile.query.filter_by(maintenance_schedule_id=schedule_id).all()
        
        # Supabaseからファイルを削除
        for file in files:
            try:
                delete_from_supabase(file.file_path)
            except Exception as e:
                current_app.logger.error(f"ファイル削除エラー: {str(e)}")
        
        # ファイル情報の削除
        MaintenanceFile.query.filter_by(maintenance_schedule_id=schedule_id).delete()
        
        # 整備予定の削除
        db.session.delete(schedule)
        db.session.commit()
        
        return jsonify({
            'message': '点検予定を削除しました'
        })
        
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({'error': f'データベースエラー: {str(e)}'}), 500

# ファイルのアップロード
#@maintenance_bp.route('/schedules/<int:schedule_id>/files/', methods=['POST'])
#def upload_file(schedule_id):
    # 整備予定の存在確認
    schedule = MaintenanceSchedule.query.get_or_404(schedule_id)
    
    # ファイルが含まれているか確認
    if 'file' not in request.files:
        return jsonify({'error': 'ファイルがありません'}), 400
    
    file = request.files['file']
    
    # ファイル名が空でないか確認
    if file.filename == '':
        return jsonify({'error': 'ファイルが選択されていません'}), 400
    
    try:
        # ファイル名の安全化
        filename = secure_filename(file.filename)
        
        # ユニークなファイル名を生成
        unique_filename = f"{uuid.uuid4().hex}_{filename}"
        
        # 一時ファイルのパス
        temp_file_path = os.path.join(current_app.config['TEMP_FOLDER'], unique_filename)
        
        # 一時ファイルとして保存
        file.save(temp_file_path)
        
        # Supabaseのストレージパス
        storage_path = f"maintenance/{schedule_id}/{unique_filename}"
        
        # ファイルデータを読み込み
        with open(temp_file_path, 'rb') as f:
            file_data = f.read()
        
        # Supabaseにアップロード
        file_url = upload_to_supabase(
            file_data=file_data,
            file_path=storage_path,
            content_type=file.content_type
        )
        
        # 一時ファイルを削除
        os.remove(temp_file_path)
        
        # ファイル情報をデータベースに保存
        new_file = MaintenanceFile(
            maintenance_schedule_id=schedule_id,
            file_name=filename,
            file_path=storage_path,
            file_url=file_url,
            file_type=file.content_type,
            file_size=len(file_data),
            description=request.form.get('description', ''),
            uploaded_by=request.form.get('uploaded_by', '')
        )
        
        db.session.add(new_file)
        db.session.commit()
        
        return jsonify({
            'id': new_file.id,
            'file_name': new_file.file_name,
            'file_path': new_file.file_path,
            'file_url': file_url,
            'message': 'ファイルをアップロードしました'
        }), 201
        
    except Exception as e:
        # エラーが発生した場合、一時ファイルが存在すれば削除
        if 'temp_file_path' in locals() and os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        
        return jsonify({'error': f'ファイルアップロードエラー: {str(e)}'}), 500
  

# 自動点検スケジュール生成
@maintenance_bp.route('/generate-schedules/', methods=['POST'])
def generate_maintenance_schedules():
    data = request.json
    
    # 必須パラメータの検証
    if 'vehicle_id' not in data and 'maintenance_type_id' not in data:
        return jsonify({'error': '車両IDまたは点検種類IDが必要です'}), 400
    
    try:
        # 生成対象の絞り込み
        vehicles_query = Vehicles.query
        if 'vehicle_id' in data:
            vehicles_query = vehicles_query.filter_by(id=data['vehicle_id'])
        
        vehicles = vehicles_query.all()
        
        maintenance_types_query = MaintenanceType.query.filter_by(is_active=True)
        if 'maintenance_type_id' in data:
            maintenance_types_query = maintenance_types_query.filter_by(id=data['maintenance_type_id'])
        
        maintenance_types = maintenance_types_query.all()
        
        # 予定状態のIDを取得
        scheduled_status = MaintenanceStatus.query.filter_by(name='予定').first()
        if not scheduled_status:
            return jsonify({'error': '予定状態が見つかりません'}), 404
        
        # 生成期間の設定
        start_date = datetime.now().date()
        end_date = start_date + timedelta(days=365)  # デフォルトは1年間
        
        if 'start_date' in data:
            start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
        if 'end_date' in data:
            end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
        
        # スケジュール生成
        generated_count = 0
        for vehicle in vehicles:
            for mtype in maintenance_types:
                # 車検の場合は、車検有効期限から逆算
                if mtype.name == '車検' and hasattr(vehicle, '有効期間の満了する日') and vehicle.有効期間の満了する日:
                    # 有効期限の取得
                    expiry_date_str = str(vehicle.有効期間の満了する日)
                    if len(expiry_date_str) == 8:
                        year = int(expiry_date_str[:4])
                        month = int(expiry_date_str[4:6])
                        day = int(expiry_date_str[6:8])
                        expiry_date = datetime(year, month, day).date()
                        
                        # 次回車検日を設定
                        next_date = expiry_date
                        
                        # 生成期間内にあり、かつ未来の日付であれば登録
                        if start_date <= next_date <= end_date and next_date >= datetime.now().date():
                            # 既に同じ予定が登録されていないか確認
                            existing = MaintenanceSchedule.query.filter_by(
                                vehicle_id=vehicle.id,
                                maintenance_type_id=mtype.id,
                                scheduled_date=next_date
                            ).first()
                            
                            if not existing:
                                # 新しい点検予定を作成
                                new_schedule = MaintenanceSchedule(
                                    vehicle_id=vehicle.id,
                                    maintenance_type_id=mtype.id,
                                    scheduled_date=next_date,
                                    status_id=scheduled_status.id,
                                    notes=f'自動生成された{mtype.name}予定'
                                )
                                db.session.add(new_schedule)
                                generated_count += 1
                
                # 他の点検タイプの場合
                else:
                    # 最新の整備記録を取得
                    latest_schedule = MaintenanceSchedule.query.filter_by(
                        vehicle_id=vehicle.id,
                        maintenance_type_id=mtype.id
                    ).order_by(MaintenanceSchedule.scheduled_date.desc()).first()
                    
                    # 次回点検日の計算
                    if latest_schedule:
                        # 最新の予定日または完了日から次の予定日を計算
                        base_date = latest_schedule.completion_date or latest_schedule.scheduled_date
                        next_date = base_date + timedelta(days=30 * mtype.cycle_months)
                    else:
                        # 過去の記録がない場合は現在から1ヶ月後に設定
                        next_date = datetime.now().date() + timedelta(days=30)
                    
                    # 生成期間内にあるか確認
                    if start_date <= next_date <= end_date:
                        # 既に同じ予定が登録されていないか確認
                        existing = MaintenanceSchedule.query.filter_by(
                            vehicle_id=vehicle.id,
                            maintenance_type_id=mtype.id,
                            scheduled_date=next_date
                        ).first()
                        
                        if not existing:
                            # 新しい点検予定を作成
                            new_schedule = MaintenanceSchedule(
                                vehicle_id=vehicle.id,
                                maintenance_type_id=mtype.id,
                                scheduled_date=next_date,
                                status_id=scheduled_status.id,
                                notes=f'自動生成された{mtype.name}予定'
                            )
                            db.session.add(new_schedule)
                            generated_count += 1
        
        db.session.commit()
        
        return jsonify({
            'message': f'{generated_count}件の点検予定を生成しました',
            'count': generated_count
        })
        
    except ValueError as e:
        return jsonify({'error': f'日付形式が正しくありません: {str(e)}'}), 400
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({'error': f'データベースエラー: {str(e)}'}), 500


# 整備点検概要の取得（ダッシュボード用）
@maintenance_bp.route('/summary/', methods=['GET'])
def get_maintenance_summary():
    try:
        today = datetime.now().date()
        month_start = datetime(today.year, today.month, 1).date()
        month_end = (datetime(today.year, today.month + 1, 1) - timedelta(days=1)).date() if today.month < 12 else datetime(today.year, 12, 31).date()
        
        # ステータスIDの取得
        status_map = {}
        for status in MaintenanceStatus.query.all():
            status_map[status.name] = status.id
        
        # 今月の点検予定件数
        scheduled_count = MaintenanceSchedule.query.filter(
            MaintenanceSchedule.scheduled_date.between(month_start, month_end),
            MaintenanceSchedule.status_id == status_map.get('予定', 0)
        ).count()
        
        # 今月の点検完了件数
        completed_count = MaintenanceSchedule.query.filter(
            MaintenanceSchedule.scheduled_date.between(month_start, month_end),
            MaintenanceSchedule.status_id == status_map.get('完了', 0)
        ).count()
        
        # 未実施の点検件数
        overdue_count = MaintenanceSchedule.query.filter(
            MaintenanceSchedule.scheduled_date < today,
            MaintenanceSchedule.status_id == status_map.get('予定', 0)
        ).count()
        
        # 今後30日以内の点検予定
        upcoming_schedules = MaintenanceSchedule.query.filter(
            MaintenanceSchedule.scheduled_date.between(today, today + timedelta(days=30)),
            MaintenanceSchedule.status_id == status_map.get('予定', 0)
        ).order_by(MaintenanceSchedule.scheduled_date).limit(5).all()
        
        # 未実施の点検予定
        overdue_schedules = MaintenanceSchedule.query.filter(
            MaintenanceSchedule.scheduled_date < today,
            MaintenanceSchedule.status_id == status_map.get('予定', 0)
        ).order_by(MaintenanceSchedule.scheduled_date).limit(5).all()
        
        # 点検種類ごとの集計
        type_counts = {}
        for mtype in MaintenanceType.query.all():
            count = MaintenanceSchedule.query.filter(
                MaintenanceSchedule.scheduled_date.between(today, today + timedelta(days=90)),
                MaintenanceSchedule.maintenance_type_id == mtype.id
            ).count()
            type_counts[mtype.name] = count
        
        # レスポンスデータの構築
        result = {
            'counts': {
                'scheduled_this_month': scheduled_count,
                'completed_this_month': completed_count,
                'overdue': overdue_count
            },
            'upcoming_schedules': [{
                'id': schedule.id,
                'vehicle_id': schedule.vehicle_id,
                'vehicle_plate': schedule.vehicle.自動車登録番号および車両番号 if hasattr(schedule.vehicle, '自動車登録番号および車両番号') else None,
                'maintenance_type': schedule.maintenance_type.name,
                'scheduled_date': schedule.scheduled_date.isoformat(),
                'days_until': (schedule.scheduled_date - today).days
            } for schedule in upcoming_schedules],
            'overdue_schedules': [{
                'id': schedule.id,
                'vehicle_id': schedule.vehicle_id,
                'vehicle_plate': schedule.vehicle.自動車登録番号および車両番号 if hasattr(schedule.vehicle, '自動車登録番号および車両番号') else None,
                'maintenance_type': schedule.maintenance_type.name,
                'scheduled_date': schedule.scheduled_date.isoformat(),
                'days_overdue': (today - schedule.scheduled_date).days
            } for schedule in overdue_schedules],
            'type_counts': type_counts
        }
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': f'エラーが発生しました: {str(e)}'}), 500


# 車検有効期限が近づいている車両の取得（続き）
@maintenance_bp.route('/expiry-alerts/', methods=['GET'])
def get_expiry_alerts():
    try:
        # クエリパラメータの取得
        days = request.args.get('days', default=90, type=int)  # デフォルトは90日
        
        today = datetime.now().date()
        target_date = today + timedelta(days=days)
        
        # 車検有効期限が近づいている車両を抽出
        alerts = []
        for vehicle in Vehicles.query.all():
            if hasattr(vehicle, '有効期間の満了する日') and vehicle.有効期間の満了する日:
                expiry_date_str = str(vehicle.有効期間の満了する日)
                if len(expiry_date_str) == 8:
                    try:
                        year = int(expiry_date_str[:4])
                        month = int(expiry_date_str[4:6])
                        day = int(expiry_date_str[6:8])
                        expiry_date = datetime(year, month, day).date()
                        
                        # 今日から指定日数以内に期限が来る車両
                        if today <= expiry_date <= target_date:
                            days_left = (expiry_date - today).days
                            alerts.append({
                                'vehicle_id': vehicle.id,
                                'plate': vehicle.自動車登録番号および車両番号 if hasattr(vehicle, '自動車登録番号および車両番号') else None,
                                'number': vehicle.型式 if hasattr(vehicle, '型式') else None,
                                'manufacturer': vehicle.車名 if hasattr(vehicle, '車名') else None,
                                'expiry_date': expiry_date.isoformat(),
                                'days_left': days_left
                            })
                        
                        # 既に期限切れの車両
                        elif expiry_date < today:
                            days_overdue = (today - expiry_date).days
                            alerts.append({
                                'vehicle_id': vehicle.id,
                                'plate': vehicle.自動車登録番号および車両番号 if hasattr(vehicle, '自動車登録番号および車両番号') else None,
                                'number': vehicle.型式 if hasattr(vehicle, '型式') else None,
                                'manufacturer': vehicle.車名 if hasattr(vehicle, '車名') else None,
                                'expiry_date': expiry_date.isoformat(),
                                'days_overdue': days_overdue
                            })
                    except ValueError:
                        pass
        
        # 期限が近い順にソート
        alerts.sort(key=lambda x: x.get('days_left', float('inf')) if 'days_left' in x else -x.get('days_overdue', 0))
        
        return jsonify(alerts)
        
    except Exception as e:
        return jsonify({'error': f'エラーが発生しました: {str(e)}'}), 500


# 日付範囲内の整備予定カレンダー取得
@maintenance_bp.route('/calendar/', methods=['GET'])
def get_maintenance_calendar():
    try:
        # クエリパラメータの取得
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')
        vehicle_id = request.args.get('vehicle_id', type=int)
        maintenance_type_id = request.args.get('maintenance_type_id', type=int)
        
        # 日付範囲の設定
        today = datetime.now().date()
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date() if start_date_str else (today - timedelta(days=30))
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date() if end_date_str else (today + timedelta(days=90))
        
        # クエリビルダー
        query = MaintenanceSchedule.query.filter(
            MaintenanceSchedule.scheduled_date.between(start_date, end_date)
        )
        
        # フィルタリング
        if vehicle_id:
            query = query.filter_by(vehicle_id=vehicle_id)
        if maintenance_type_id:
            query = query.filter_by(maintenance_type_id=maintenance_type_id)
        
        # スケジュールの取得
        schedules = query.all()
        
        # カレンダーイベントデータの構築
        events = []
        for schedule in schedules:
            # 車両情報の取得
            vehicle = schedule.vehicle
            
            # 状態に応じた色の設定
            color = schedule.status.color_code if schedule.status else '#007bff'
            
            # イベントデータの作成
            event = {
                'id': schedule.id,
                'title': f"{schedule.maintenance_type.name} ({vehicle.自動車登録番号および車両番号 if hasattr(vehicle, '自動車登録番号および車両番号') else vehicle.id})",
                'start': schedule.scheduled_date.isoformat(),
                'end': schedule.scheduled_date.isoformat(),
                'allDay': True,
                'backgroundColor': color,
                'borderColor': color,
                'status': schedule.status.name if schedule.status else '不明',
                'vehicle_id': vehicle.id,
                'maintenance_type_id': schedule.maintenance_type_id,
                'technician': schedule.technician
            }
            events.append(event)
        
        return jsonify(events)
        
    except ValueError as e:
        return jsonify({'error': f'日付形式が正しくありません: {str(e)}'}), 400
    except Exception as e:
        return jsonify({'error': f'エラーが発生しました: {str(e)}'}), 500


# 車両ごとの3か月点検スケジュール生成（過去から将来までのスケジュールを埋める）
@maintenance_bp.route('/generate-3month-schedules/', methods=['POST'])
def generate_3month_schedules():
    data = request.json
    
    try:
        # 生成対象の絞り込み
        vehicles_query = Vehicles.query
        if 'vehicle_id' in data:
            vehicles_query = vehicles_query.filter_by(id=data['vehicle_id'])
        
        vehicles = vehicles_query.all()
        
        # 3ヶ月点検の種類IDを取得
        maintenance_type = MaintenanceType.query.filter_by(name='3ヶ月点検').first()
        if not maintenance_type:
            return jsonify({'error': '3ヶ月点検の種類が見つかりません'}), 404
        
        # 予定状態のIDを取得
        scheduled_status = MaintenanceStatus.query.filter_by(name='予定').first()
        if not scheduled_status:
            return jsonify({'error': '予定状態が見つかりません'}), 404
        
        completed_status = MaintenanceStatus.query.filter_by(name='完了').first()
        if not completed_status:
            return jsonify({'error': '完了状態が見つかりません'}), 404
        
        # 生成期間の設定
        today = datetime.now().date()
        start_date = today - timedelta(days=365 * 2)  # 2年前から
        end_date = today + timedelta(days=365)  # 1年後まで
        
        if 'start_date' in data:
            start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
        if 'end_date' in data:
            end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
        
        # スケジュール生成
        generated_count = 0
        for vehicle in vehicles:
            # 最初の点検日を設定（データから取得できない場合は推定）
            first_schedule_date = None
            
            # 車両の登録年月を基に最初の点検日を推定
            if hasattr(vehicle, '初年度登録年月') and vehicle.初年度登録年月:
                year_month_str = str(vehicle.初年度登録年月).zfill(4)
                try:
                    year = 2000 + int(year_month_str[:2])  # 2桁の年を4桁に変換
                    if int(year_month_str[:2]) > 70:  # 70年代以前なら1900年代と判断
                        year = 1900 + int(year_month_str[:2])
                    month = int(year_month_str[2:])
                    first_schedule_date = datetime(year, month, 1).date()  # 月の初日を使用
                except ValueError:
                    pass
            
            # 最初の点検日が設定できない場合は2年前に設定
            if not first_schedule_date:
                first_schedule_date = start_date
            
            # 点検スケジュールを3ヶ月間隔で生成
            current_date = first_schedule_date
            while current_date <= end_date:
                # 生成期間内にあるか確認
                if start_date <= current_date <= end_date:
                    # 既に同じ予定が登録されていないか確認
                    existing = MaintenanceSchedule.query.filter_by(
                        vehicle_id=vehicle.id,
                        maintenance_type_id=maintenance_type.id,
                        scheduled_date=current_date
                    ).first()
                    
                    if not existing:
                        # 過去の日付は完了、未来の日付は予定として登録
                        status_id = completed_status.id if current_date < today else scheduled_status.id
                        
                        # 新しい点検予定を作成
                        new_schedule = MaintenanceSchedule(
                            vehicle_id=vehicle.id,
                            maintenance_type_id=maintenance_type.id,
                            scheduled_date=current_date,
                            completion_date=current_date if current_date < today else None,
                            status_id=status_id,
                            notes=f'自動生成された3ヶ月点検予定'
                        )
                        db.session.add(new_schedule)
                        generated_count += 1
                
                # 次の3ヶ月後の日付に進む
                current_date = current_date + timedelta(days=90)
        
        db.session.commit()
        
        return jsonify({
            'message': f'{generated_count}件の3ヶ月点検予定を生成しました',
            'count': generated_count
        })
        
    except ValueError as e:
        return jsonify({'error': f'日付形式が正しくありません: {str(e)}'}), 400
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({'error': f'データベースエラー: {str(e)}'}), 500


# 予定日を基準に点検状態を自動更新
@maintenance_bp.route('/update-statuses/', methods=['POST'])
def update_maintenance_statuses():
    try:
        # ステータスIDの取得
        scheduled_status = MaintenanceStatus.query.filter_by(name='予定').first()
        if not scheduled_status:
            return jsonify({'error': '予定状態が見つかりません'}), 404
        
        overdue_status = MaintenanceStatus.query.filter_by(name='未実施').first()
        if not overdue_status:
            # 未実施状態がない場合は予定状態のままにする
            overdue_status = scheduled_status
        
        today = datetime.now().date()
        
        # 期限切れの点検予定を未実施に更新
        expired_schedules = MaintenanceSchedule.query.filter(
            MaintenanceSchedule.scheduled_date < today,
            MaintenanceSchedule.status_id == scheduled_status.id,
            MaintenanceSchedule.completion_date.is_(None)
        ).all()
        
        updated_count = 0
        for schedule in expired_schedules:
            schedule.status_id = overdue_status.id
            updated_count += 1
        
        db.session.commit()
        
        return jsonify({
            'message': f'{updated_count}件の点検予定の状態を更新しました',
            'count': updated_count
        })
        
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({'error': f'データベースエラー: {str(e)}'}), 500


# 点検実績の登録（完了処理）
@maintenance_bp.route('/schedules/<int:schedule_id>/complete/', methods=['POST'])
def complete_maintenance_schedule(schedule_id):
    # 整備予定の取得
    schedule = MaintenanceSchedule.query.get_or_404(schedule_id)
    
    data = request.json
    
    try:
        # 完了状態のIDを取得
        completed_status = MaintenanceStatus.query.filter_by(name='完了').first()
        if not completed_status:
            return jsonify({'error': '完了状態が見つかりません'}), 404
        
        # 完了日の設定
        completion_date = None
        if 'completion_date' in data and data['completion_date']:
            completion_date = datetime.strptime(data['completion_date'], '%Y-%m-%d').date()
        else:
            completion_date = datetime.now().date()
        
        # 点検結果の更新
        schedule.status_id = completed_status.id
        schedule.completion_date = completion_date
        schedule.technician = data.get('technician', schedule.technician)
        schedule.location = data.get('location', schedule.location)
        schedule.cost = data.get('cost', schedule.cost)
        schedule.notes = data.get('notes', schedule.notes)
        
        # 詳細情報の更新（存在する場合）
        if 'details' in data and isinstance(data['details'], list):
            # 既存の詳細情報を削除
            MaintenanceDetail.query.filter_by(maintenance_schedule_id=schedule_id).delete()
            
            # 新しい詳細情報を追加
            for detail_data in data['details']:
                detail = MaintenanceDetail(
                    maintenance_schedule_id=schedule_id,
                    item_name=detail_data['item_name'],
                    result=detail_data.get('result'),
                    is_ok=detail_data.get('is_ok'),
                    action_taken=detail_data.get('action_taken'),
                    parts_used=detail_data.get('parts_used'),
                    parts_cost=detail_data.get('parts_cost'),
                    notes=detail_data.get('notes')
                )
                db.session.add(detail)
        
        db.session.commit()
        
        return jsonify({
            'id': schedule.id,
            'message': '点検を完了処理しました',
            'completion_date': completion_date.isoformat()
        })
        
    except ValueError as e:
        return jsonify({'error': f'日付形式が正しくありません: {str(e)}'}), 400
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({'error': f'データベースエラー: {str(e)}'}), 500


# ファイルのダウンロードURLを取得
#@maintenance_bp.route('/files/<int:file_id>/', methods=['GET'])
#def get_file_url(file_id):
    # ファイル情報の取得
    file = MaintenanceFile.query.get_or_404(file_id)
    
    # ファイルのURLを生成
    file_url = f"/uploads/{file.file_path}"
    
    return jsonify({
        'id': file.id,
        'file_name': file.file_name,
        'file_path': file.file_path,
        'file_url': file_url,
        'file_type': file.file_type,
        'file_size': file.file_size,
        'description': file.description
    })


# 車両・点検タイプ・期間ごとの整備実績統計
@maintenance_bp.route('/statistics/', methods=['GET'])
def get_maintenance_statistics():
    try:
        # クエリパラメータの取得
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')
        group_by = request.args.get('group_by', 'type')  # 'type', 'vehicle', 'month'
        
        # 日付範囲の設定
        today = datetime.now().date()
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date() if start_date_str else (today - timedelta(days=365))
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date() if end_date_str else today
        
        # 完了状態のIDを取得
        completed_status = MaintenanceStatus.query.filter_by(name='完了').first()
        if not completed_status:
            return jsonify({'error': '完了状態が見つかりません'}), 404
        
        # 基本クエリ - 完了した整備のみを対象
        base_query = MaintenanceSchedule.query.filter(
            MaintenanceSchedule.status_id == completed_status.id,
            MaintenanceSchedule.completion_date.between(start_date, end_date)
        )
        
        # グループ化の種類に応じた集計
        if group_by == 'type':
            # 点検種類ごとの集計
            result = []
            for mtype in MaintenanceType.query.all():
                count = base_query.filter_by(maintenance_type_id=mtype.id).count()
                if count > 0:
                    result.append({
                        'maintenance_type_id': mtype.id,
                        'maintenance_type_name': mtype.name,
                        'count': count
                    })
            
            # 件数の多い順にソート
            result.sort(key=lambda x: x['count'], reverse=True)
            
        elif group_by == 'vehicle':
            # 車両ごとの集計
            result = []
            for vehicle in Vehicles.query.all():
                count = base_query.filter_by(vehicle_id=vehicle.id).count()
                if count > 0:
                    result.append({
                        'vehicle_id': vehicle.id,
                        'vehicle_plate': vehicle.自動車登録番号および車両番号 if hasattr(vehicle, '自動車登録番号および車両番号') else None,
                        'vehicle_number': vehicle.型式 if hasattr(vehicle, '型式') else None,
                        'count': count
                    })
            
            # 件数の多い順にソート
            result.sort(key=lambda x: x['count'], reverse=True)
            
        elif group_by == 'month':
            # 月ごとの集計
            monthly_data = {}
            for schedule in base_query.all():
                # 月ごとにグループ化
                month_key = schedule.completion_date.strftime('%Y-%m')
                if month_key not in monthly_data:
                    monthly_data[month_key] = {
                        'year': schedule.completion_date.year,
                        'month': schedule.completion_date.month,
                        'count': 0
                    }
                monthly_data[month_key]['count'] += 1
            
            # 結果配列に変換
            result = list(monthly_data.values())
            
            # 日付の昇順にソート
            result.sort(key=lambda x: (x['year'], x['month']))
            
        else:
            return jsonify({'error': '無効なgroup_byパラメータです'}), 400
        
        return jsonify({
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'group_by': group_by,
            'data': result
        })
        
    except ValueError as e:
        return jsonify({'error': f'日付形式が正しくありません: {str(e)}'}), 400
    except Exception as e:
        return jsonify({'error': f'エラーが発生しました: {str(e)}'}), 500