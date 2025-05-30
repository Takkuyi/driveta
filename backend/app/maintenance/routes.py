# app/maintenance/routes.py - 改良版（Supabase対応）

from flask import Blueprint, jsonify, request, current_app
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import text, and_, or_
from datetime import datetime, timedelta
import os

from app.extensions import db
from app.vehicle.models import Vehicles
from app.maintenance.models import MaintenanceType, MaintenanceStatus, MaintenanceSchedule, MaintenanceDetail, MaintenanceFile

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
            'technician_id': schedule.technician_id,
            'location': schedule.location,
            'cost': float(schedule.cost) if schedule.cost else None,
            'notes': schedule.notes,
            'created_at': schedule.created_at.isoformat(),
            'updated_at': schedule.updated_at.isoformat()
        }
        result.append(schedule_data)
    
    return jsonify(result)

# 改良版自動点検スケジュール生成
@maintenance_bp.route('/generate-schedules/', methods=['POST'])
def generate_maintenance_schedules():
    """車両の有効期間満了日から12ヶ月点検と3ヶ月点検の予定を自動生成"""
    data = request.json or {}
    
    try:
        # 生成期間の設定
        today = datetime.now().date()
        start_date = today
        end_date = today + timedelta(days=365)  # デフォルトは1年間
        
        if 'start_date' in data:
            start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
        if 'end_date' in data:
            end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
        
        # 必要なステータスと点検種類のIDを取得
        tentative_status = MaintenanceStatus.query.filter_by(name='仮予定').first()
        if not tentative_status:
            # 仮予定がなければ作成
            tentative_status = MaintenanceStatus(
                name='仮予定', 
                description='自動生成された仮の点検予定', 
                color_code='#6c757d'
            )
            db.session.add(tentative_status)
            db.session.commit()
        
        inspection_type = MaintenanceType.query.filter_by(name='車検').first()
        three_month_type = MaintenanceType.query.filter_by(name='3ヶ月点検').first()
        
        if not inspection_type or not three_month_type:
            return jsonify({'error': '点検種類が正しく設定されていません'}), 400
        
        # PostgreSQL用のSQL実行（ストアドプロシージャ呼び出し）
        try:
            result = db.session.execute(text("SELECT * FROM generate_maintenance_schedules()"))
            row = result.fetchone()
            generated_count = row[0] if row else 0
            
            db.session.commit()
            
            return jsonify({
                'message': f'{generated_count}件の点検予定を生成しました',
                'count': generated_count
            })
            
        except Exception as e:
            # ストアドプロシージャがない場合はPythonロジックで実行
            return generate_schedules_python_logic(
                start_date, end_date, tentative_status, inspection_type, three_month_type
            )
            
    except ValueError as e:
        return jsonify({'error': f'日付形式が正しくありません: {str(e)}'}), 400
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({'error': f'データベースエラー: {str(e)}'}), 500

def generate_schedules_python_logic(start_date, end_date, tentative_status, inspection_type, three_month_type):
    """Pythonロジックによる点検予定生成"""
    generated_count = 0
    today = datetime.now().date()
    
    # 全車両を取得
    vehicles = Vehicles.query.filter(
        Vehicles.有効期間の満了する日.isnot(None)
    ).all()
    
    for vehicle in vehicles:
        try:
            # 有効期限の日付を変換（8桁数値 → DATE型）
            expiry_date_str = str(vehicle.有効期間の満了する日)
            if len(expiry_date_str) == 8:
                year = int(expiry_date_str[:4])
                month = int(expiry_date_str[4:6])
                day = int(expiry_date_str[6:8])
                expiry_date = datetime(year, month, day).date()
                
                # 現在日時より未来の期限のみ処理
                if expiry_date > today and start_date <= expiry_date <= end_date:
                    # 12ヶ月点検（車検）の予定生成
                    if not MaintenanceSchedule.query.filter_by(
                        vehicle_id=vehicle.id,
                        maintenance_type_id=inspection_type.id,
                        scheduled_date=expiry_date
                    ).first():
                        new_schedule = MaintenanceSchedule(
                            vehicle_id=vehicle.id,
                            maintenance_type_id=inspection_type.id,
                            scheduled_date=expiry_date,
                            status_id=tentative_status.id,
                            notes='自動生成された車検予定'
                        )
                        db.session.add(new_schedule)
                        generated_count += 1
                    
                    # 3ヶ月点検の予定生成（車検日から逆算して複数生成）
                    for i in range(1, 5):  # 3ヶ月、6ヶ月、9ヶ月、12ヶ月前
                        three_month_date = expiry_date - timedelta(days=90 * i)
                        
                        # 過去の日付または既存の予定がある場合はスキップ
                        if (three_month_date > today and 
                            start_date <= three_month_date <= end_date and
                            not MaintenanceSchedule.query.filter_by(
                                vehicle_id=vehicle.id,
                                maintenance_type_id=three_month_type.id,
                                scheduled_date=three_month_date
                            ).first()):
                            
                            new_schedule = MaintenanceSchedule(
                                vehicle_id=vehicle.id,
                                maintenance_type_id=three_month_type.id,
                                scheduled_date=three_month_date,
                                status_id=tentative_status.id,
                                notes='自動生成された3ヶ月点検予定'
                            )
                            db.session.add(new_schedule)
                            generated_count += 1
        
        except (ValueError, TypeError):
            continue  # 無効な日付の場合はスキップ
    
    db.session.commit()
    
    return jsonify({
        'message': f'{generated_count}件の点検予定を生成しました',
        'count': generated_count
    })

# 整備点検概要の取得（ダッシュボード用）- 仮予定対応版
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
        
        # 仮予定の件数
        tentative_count = MaintenanceSchedule.query.filter(
            MaintenanceSchedule.status_id == status_map.get('仮予定', 0)
        ).count()
        
        # 今月の点検予定件数（確定予定のみ）
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
            or_(
                MaintenanceSchedule.status_id == status_map.get('予定', 0),
                MaintenanceSchedule.status_id == status_map.get('仮予定', 0)
            ),
            MaintenanceSchedule.completion_date.is_(None)
        ).count()
        
        # 今後30日以内の点検予定
        upcoming_schedules = MaintenanceSchedule.query.filter(
            MaintenanceSchedule.scheduled_date.between(today, today + timedelta(days=30)),
            or_(
                MaintenanceSchedule.status_id == status_map.get('予定', 0),
                MaintenanceSchedule.status_id == status_map.get('仮予定', 0)
            )
        ).order_by(MaintenanceSchedule.scheduled_date).limit(5).all()
        
        # 未実施の点検予定
        overdue_schedules = MaintenanceSchedule.query.filter(
            MaintenanceSchedule.scheduled_date < today,
            or_(
                MaintenanceSchedule.status_id == status_map.get('予定', 0),
                MaintenanceSchedule.status_id == status_map.get('仮予定', 0)
            ),
            MaintenanceSchedule.completion_date.is_(None)
        ).order_by(MaintenanceSchedule.scheduled_date).limit(5).all()
        
        # レスポンスデータの構築
        result = {
            'counts': {
                'tentative': tentative_count,
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
                'days_until': (schedule.scheduled_date - today).days,
                'status': schedule.status.name
            } for schedule in upcoming_schedules],
            'overdue_schedules': [{
                'id': schedule.id,
                'vehicle_id': schedule.vehicle_id,
                'vehicle_plate': schedule.vehicle.自動車登録番号および車両番号 if hasattr(schedule.vehicle, '自動車登録番号および車両番号') else None,
                'maintenance_type': schedule.maintenance_type.name,
                'scheduled_date': schedule.scheduled_date.isoformat(),
                'days_overdue': (today - schedule.scheduled_date).days,
                'status': schedule.status.name
            } for schedule in overdue_schedules]
        }
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': f'エラーが発生しました: {str(e)}'}), 500

# 点検予定の一括操作API
@maintenance_bp.route('/schedules/bulk-update/', methods=['POST'])
def bulk_update_schedules():
    """複数の点検予定を一括で更新"""
    data = request.json
    
    if not data or 'schedule_ids' not in data or 'operation' not in data:
        return jsonify({'error': '必要なパラメータが不足しています'}), 400
    
    schedule_ids = data['schedule_ids']
    operation = data['operation']
    
    if not schedule_ids:
        return jsonify({'error': '更新対象の予定が選択されていません'}), 400
    
    try:
        updated_count = 0
        
        # 操作の種類に応じて処理
        if operation == 'confirm':
            # 仮予定を確定予定に変更
            scheduled_status = MaintenanceStatus.query.filter_by(name='予定').first()
            if not scheduled_status:
                return jsonify({'error': '確定状態が見つかりません'}), 404
            
            updated_count = MaintenanceSchedule.query.filter(
                MaintenanceSchedule.id.in_(schedule_ids)
            ).update(
                {'status_id': scheduled_status.id, 'updated_at': datetime.now()},
                synchronize_session=False
            )
            
        elif operation == 'complete':
            # 一括完了処理
            completed_status = MaintenanceStatus.query.filter_by(name='完了').first()
            if not completed_status:
                return jsonify({'error': '完了状態が見つかりません'}), 404
            
            completion_date = data.get('completion_date', datetime.now().date().isoformat())
            completion_date = datetime.strptime(completion_date, '%Y-%m-%d').date()
            
            updated_count = MaintenanceSchedule.query.filter(
                MaintenanceSchedule.id.in_(schedule_ids)
            ).update({
                'status_id': completed_status.id,
                'completion_date': completion_date,
                'updated_at': datetime.now()
            }, synchronize_session=False)
            
        elif operation == 'postpone':
            # 一括延期処理
            days_to_postpone = data.get('days', 7)  # デフォルト7日
            
            for schedule_id in schedule_ids:
                schedule = MaintenanceSchedule.query.get(schedule_id)
                if schedule:
                    new_date = schedule.scheduled_date + timedelta(days=days_to_postpone)
                    schedule.scheduled_date = new_date
                    schedule.updated_at = datetime.now()
                    updated_count += 1
                    
        elif operation == 'cancel':
            # 一括キャンセル処理
            cancelled_status = MaintenanceStatus.query.filter_by(name='キャンセル').first()
            if not cancelled_status:
                return jsonify({'error': 'キャンセル状態が見つかりません'}), 404
            
            updated_count = MaintenanceSchedule.query.filter(
                MaintenanceSchedule.id.in_(schedule_ids)
            ).update({
                'status_id': cancelled_status.id,
                'updated_at': datetime.now(),
                'notes': MaintenanceSchedule.notes + '\n一括キャンセル処理'
            }, synchronize_session=False)
            
        else:
            return jsonify({'error': f'未対応の操作: {operation}'}), 400
        
        db.session.commit()
        
        return jsonify({
            'message': f'{updated_count}件の予定を更新しました',
            'updated_count': updated_count,
            'operation': operation
        })
        
    except ValueError as e:
        return jsonify({'error': f'日付形式が正しくありません: {str(e)}'}), 400
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({'error': f'データベースエラー: {str(e)}'}), 500

# 期限切れ予定の自動更新
@maintenance_bp.route('/update-overdue-schedules/', methods=['POST'])
def update_overdue_schedules():
    """期限切れの予定を未実施状態に自動更新"""
    try:
        today = datetime.now().date()
        
        # ステータスIDを取得
        scheduled_status = MaintenanceStatus.query.filter_by(name='予定').first()
        tentative_status = MaintenanceStatus.query.filter_by(name='仮予定').first()
        overdue_status = MaintenanceStatus.query.filter_by(name='未実施').first()
        
        if not overdue_status:
            # 未実施状態がない場合は作成
            overdue_status = MaintenanceStatus(
                name='未実施',
                description='期限切れ未実施',
                color_code='#dc3545'
            )
            db.session.add(overdue_status)
            db.session.commit()
        
        # 期限切れの予定を未実施に更新
        updated_count = MaintenanceSchedule.query.filter(
            MaintenanceSchedule.scheduled_date < today,
            or_(
                MaintenanceSchedule.status_id == scheduled_status.id if scheduled_status else 0,
                MaintenanceSchedule.status_id == tentative_status.id if tentative_status else 0
            ),
            MaintenanceSchedule.completion_date.is_(None)
        ).update({
            'status_id': overdue_status.id,
            'updated_at': datetime.now()
        }, synchronize_session=False)
        
        db.session.commit()
        
        return jsonify({
            'message': f'{updated_count}件の期限切れ予定を更新しました',
            'updated_count': updated_count
        })
        
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({'error': f'データベースエラー: {str(e)}'}), 500

# 車検有効期限アラート取得（改良版）
@maintenance_bp.route('/expiry-alerts/', methods=['GET'])
def get_expiry_alerts():
    try:
        # クエリパラメータの取得
        days = request.args.get('days', default=90, type=int)
        
        today = datetime.now().date()
        target_date = today + timedelta(days=days)
        
        # 車検有効期限が近づいている車両を抽出
        alerts = []
        vehicles = Vehicles.query.filter(
            Vehicles.有効期間の満了する日.isnot(None)
        ).all()
        
        for vehicle in vehicles:
            if vehicle.有効期間の満了する日:
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
                            
                            # 既に車検予定が登録されているかチェック
                            existing_schedule = MaintenanceSchedule.query.filter(
                                MaintenanceSchedule.vehicle_id == vehicle.id,
                                MaintenanceSchedule.scheduled_date >= today,
                                MaintenanceSchedule.maintenance_type.has(name='車検')
                            ).first()
                            
                            alerts.append({
                                'vehicle_id': vehicle.id,
                                'plate': vehicle.自動車登録番号および車両番号 if hasattr(vehicle, '自動車登録番号および車両番号') else None,
                                'number': vehicle.型式 if hasattr(vehicle, '型式') else None,
                                'manufacturer': vehicle.車名 if hasattr(vehicle, '車名') else None,
                                'expiry_date': expiry_date.isoformat(),
                                'days_left': days_left,
                                'has_schedule': existing_schedule is not None,
                                'schedule_id': existing_schedule.id if existing_schedule else None,
                                'schedule_status': existing_schedule.status.name if existing_schedule else None
                            })
                        
                        # 既に期限切れの車両
                        elif expiry_date < today:
                            days_overdue = (today - expiry_date).days
                            
                            # 既に車検予定が登録されているかチェック
                            existing_schedule = MaintenanceSchedule.query.filter(
                                MaintenanceSchedule.vehicle_id == vehicle.id,
                                MaintenanceSchedule.scheduled_date >= expiry_date,
                                MaintenanceSchedule.maintenance_type.has(name='車検')
                            ).first()
                            
                            alerts.append({
                                'vehicle_id': vehicle.id,
                                'plate': vehicle.自動車登録番号および車両番号 if hasattr(vehicle, '自動車登録番号および車両番号') else None,
                                'number': vehicle.型式 if hasattr(vehicle, '型式') else None,
                                'manufacturer': vehicle.車名 if hasattr(vehicle, '車名') else None,
                                'expiry_date': expiry_date.isoformat(),
                                'days_overdue': days_overdue,
                                'has_schedule': existing_schedule is not None,
                                'schedule_id': existing_schedule.id if existing_schedule else None,
                                'schedule_status': existing_schedule.status.name if existing_schedule else None
                            })
                    except ValueError:
                        pass
        
        # 期限が近い順にソート
        alerts.sort(key=lambda x: x.get('days_left', float('inf')) if 'days_left' in x else -x.get('days_overdue', 0))
        
        return jsonify(alerts)
        
    except Exception as e:
        return jsonify({'error': f'エラーが発生しました: {str(e)}'}), 500

# その他の既存APIエンドポイント（点検詳細取得、更新、削除など）は既存コードを継承
# 以下は主要な追加・修正されたエンドポイントのみ記載

# 点検予定/実績詳細取得（改良版）
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
        'technician': schedule.technician,
        'technician_id': schedule.technician_id,
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
    
    # 担当者情報を追加
    if schedule.technician_id and hasattr(schedule, 'technician_employee') and schedule.technician_employee:
        schedule_data['technician_employee'] = {
            'id': schedule.technician_employee.id,
            'employee_code': schedule.technician_employee.employee_code,
            'full_name': schedule.technician_employee.full_name,
            'department': schedule.technician_employee.department
        }
    
    return jsonify(schedule_data)