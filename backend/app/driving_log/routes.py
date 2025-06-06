# backend/app/driving_log/routes.py

from flask import Blueprint, jsonify, request
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime, date
from app.extensions import db
from app.driving_log.models import DrivingLog, DeliveryDestination, FuelingRecord, CarWashRecord
from app.employee.models import Employee
from app.vehicle.models import Vehicles

driving_log_bp = Blueprint('driving_log', __name__, url_prefix='/api/driving-log')

# ===== 配送先管理 =====

@driving_log_bp.route('/destinations/', methods=['GET'])
def list_destinations():
    """配送先一覧取得"""
    destinations = DeliveryDestination.query.filter_by(is_active=True).order_by(DeliveryDestination.name).all()
    
    result = [{
        'id': dest.id,
        'name': dest.name,
        'address': dest.address,
        'phone': dest.phone,
        'contact_person': dest.contact_person,
        'notes': dest.notes
    } for dest in destinations]
    
    return jsonify(result)

@driving_log_bp.route('/destinations/', methods=['POST'])
def create_destination():
    """配送先新規登録"""
    data = request.json
    
    if not data.get('name'):
        return jsonify({'error': '配送先名は必須です'}), 400
    
    try:
        new_destination = DeliveryDestination(
            name=data['name'],
            address=data.get('address'),
            phone=data.get('phone'),
            contact_person=data.get('contact_person'),
            notes=data.get('notes')
        )
        
        db.session.add(new_destination)
        db.session.commit()
        
        return jsonify({
            'id': new_destination.id,
            'message': '配送先を登録しました'
        }), 201
        
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({'error': f'データベースエラー: {str(e)}'}), 500

# ===== 運転日報管理 =====

@driving_log_bp.route('/logs/', methods=['GET'])
def list_driving_logs():
    """運転日報一覧取得"""
    # クエリパラメータ
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    driver_id = request.args.get('driver_id', type=int)
    vehicle_id = request.args.get('vehicle_id', type=int)
    
    # クエリビルダー
    query = DrivingLog.query
    
    # フィルタリング
    if start_date:
        try:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            query = query.filter(DrivingLog.date >= start_date)
        except ValueError:
            pass
    
    if end_date:
        try:
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
            query = query.filter(DrivingLog.date <= end_date)
        except ValueError:
            pass
    
    if driver_id:
        query = query.filter_by(driver_id=driver_id)
    
    if vehicle_id:
        query = query.filter_by(vehicle_id=vehicle_id)
    
    # 日付の新しい順で取得
    logs = query.order_by(DrivingLog.date.desc()).all()
    
    result = []
    for log in logs:
        result.append({
            'id': log.id,
            'date': log.date.isoformat(),
            'driver': {
                'id': log.driver_id,
                'name': log.driver.full_name if log.driver else None
            },
            'vehicle': {
                'id': log.vehicle_id,
                'plate': log.vehicle.自動車登録番号および車両番号 if log.vehicle else None
            },
            'start_time': log.start_time.strftime('%H:%M') if log.start_time else None,
            'end_time': log.end_time.strftime('%H:%M') if log.end_time else None,
            'start_mileage': log.start_mileage,
            'end_mileage': log.end_mileage,
            'daily_mileage': log.daily_mileage,
            'work_hours': round(log.work_hours, 2),
            'destination': {
                'id': log.destination_id,
                'name': log.destination.name if log.destination else log.destination_name
            },
            'is_trainee': log.is_trainee,
            'notes': log.notes,
            'created_at': log.created_at.isoformat()
        })
    
    return jsonify(result)

@driving_log_bp.route('/logs/', methods=['POST'])
def create_driving_log():
    """運転日報新規登録"""
    data = request.json
    
    # 必須フィールドの検証
    required_fields = ['date', 'driver_id', 'vehicle_id', 'start_time', 'end_time', 'start_mileage', 'end_mileage']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'必須フィールド "{field}" がありません'}), 400
    
    try:
        # 日付と時刻の変換
        log_date = datetime.strptime(data['date'], '%Y-%m-%d').date()
        start_time = datetime.strptime(data['start_time'], '%H:%M').time()
        end_time = datetime.strptime(data['end_time'], '%H:%M').time()
        
        # 走行距離の妥当性チェック
        start_mileage = int(data['start_mileage'])
        end_mileage = int(data['end_mileage'])
        
        if end_mileage < start_mileage:
            return jsonify({'error': '終了時走行距離は開始時走行距離より大きくしてください'}), 400
        
        # 同日・同ドライバー・同車両の重複チェック
        existing = DrivingLog.query.filter_by(
            date=log_date,
            driver_id=data['driver_id'],
            vehicle_id=data['vehicle_id']
        ).first()
        
        if existing:
            return jsonify({'error': '同じ日付・ドライバー・車両の記録が既に存在します'}), 400
        
        # 新規運転日報の作成
        new_log = DrivingLog(
            date=log_date,
            driver_id=data['driver_id'],
            vehicle_id=data['vehicle_id'],
            start_time=start_time,
            end_time=end_time,
            start_mileage=start_mileage,
            end_mileage=end_mileage,
            destination_id=data.get('destination_id'),
            destination_name=data.get('destination_name'),
            is_trainee=data.get('is_trainee', False),
            notes=data.get('notes'),
            created_by=data.get('created_by')  # 登録者ID
        )
        
        db.session.add(new_log)
        db.session.commit()
        
        return jsonify({
            'id': new_log.id,
            'message': '運転日報を登録しました',
            'daily_mileage': new_log.daily_mileage,
            'work_hours': round(new_log.work_hours, 2)
        }), 201
        
    except ValueError as e:
        return jsonify({'error': f'日付・時刻の形式が正しくありません: {str(e)}'}), 400
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({'error': f'データベースエラー: {str(e)}'}), 500

@driving_log_bp.route('/logs/<int:log_id>/', methods=['GET'])
def get_driving_log(log_id):
    """運転日報詳細取得"""
    log = DrivingLog.query.get_or_404(log_id)
    
    result = {
        'id': log.id,
        'date': log.date.isoformat(),
        'driver': {
            'id': log.driver_id,
            'name': log.driver.full_name if log.driver else None,
            'employee_code': log.driver.employee_code if log.driver else None
        },
        'vehicle': {
            'id': log.vehicle_id,
            'plate': log.vehicle.自動車登録番号および車両番号 if log.vehicle else None,
            'manufacturer': log.vehicle.車名 if log.vehicle else None
        },
        'start_time': log.start_time.strftime('%H:%M') if log.start_time else None,
        'end_time': log.end_time.strftime('%H:%M') if log.end_time else None,
        'start_mileage': log.start_mileage,
        'end_mileage': log.end_mileage,
        'daily_mileage': log.daily_mileage,
        'work_hours': round(log.work_hours, 2),
        'destination': {
            'id': log.destination_id,
            'name': log.destination.name if log.destination else log.destination_name
        },
        'is_trainee': log.is_trainee,
        'notes': log.notes,
        'created_at': log.created_at.isoformat(),
        'updated_at': log.updated_at.isoformat()
    }
    
    return jsonify(result)

@driving_log_bp.route('/logs/<int:log_id>/', methods=['PUT'])
def update_driving_log(log_id):
    """運転日報更新"""
    log = DrivingLog.query.get_or_404(log_id)
    data = request.json
    
    try:
        # 更新可能なフィールドを更新
        if 'date' in data:
            log.date = datetime.strptime(data['date'], '%Y-%m-%d').date()
        if 'driver_id' in data:
            log.driver_id = data['driver_id']
        if 'vehicle_id' in data:
            log.vehicle_id = data['vehicle_id']
        if 'start_time' in data:
            log.start_time = datetime.strptime(data['start_time'], '%H:%M').time()
        if 'end_time' in data:
            log.end_time = datetime.strptime(data['end_time'], '%H:%M').time()
        if 'start_mileage' in data:
            log.start_mileage = int(data['start_mileage'])
        if 'end_mileage' in data:
            log.end_mileage = int(data['end_mileage'])
        if 'destination_id' in data:
            log.destination_id = data['destination_id']
        if 'destination_name' in data:
            log.destination_name = data['destination_name']
        if 'is_trainee' in data:
            log.is_trainee = data['is_trainee']
        if 'notes' in data:
            log.notes = data['notes']
        
        # 走行距離の妥当性チェック
        if log.end_mileage < log.start_mileage:
            return jsonify({'error': '終了時走行距離は開始時走行距離より大きくしてください'}), 400
        
        db.session.commit()
        
        return jsonify({
            'id': log.id,
            'message': '運転日報を更新しました',
            'daily_mileage': log.daily_mileage,
            'work_hours': round(log.work_hours, 2)
        })
        
    except ValueError as e:
        return jsonify({'error': f'日付・時刻の形式が正しくありません: {str(e)}'}), 400
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({'error': f'データベースエラー: {str(e)}'}), 500

@driving_log_bp.route('/logs/<int:log_id>/', methods=['DELETE'])
def delete_driving_log(log_id):
    """運転日報削除"""
    log = DrivingLog.query.get_or_404(log_id)
    
    try:
        db.session.delete(log)
        db.session.commit()
        
        return jsonify({'message': '運転日報を削除しました'})
        
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({'error': f'データベースエラー: {str(e)}'}), 500

# ===== 統計情報 =====

@driving_log_bp.route('/statistics/', methods=['GET'])
def get_driving_statistics():
    """運転統計情報取得"""
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    if not start_date or not end_date:
        return jsonify({'error': '開始日と終了日を指定してください'}), 400
    
    try:
        start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
        
        # 期間内の運転日報を取得
        logs = DrivingLog.query.filter(
            DrivingLog.date.between(start_date, end_date)
        ).all()
        
        # 統計計算
        total_mileage = sum(log.daily_mileage for log in logs)
        total_work_hours = sum(log.work_hours for log in logs)
        total_days = len(logs)
        
        # ドライバー別統計
        driver_stats = {}
        for log in logs:
            driver_name = log.driver.full_name if log.driver else f'ID:{log.driver_id}'
            if driver_name not in driver_stats:
                driver_stats[driver_name] = {
                    'total_mileage': 0,
                    'total_hours': 0,
                    'total_days': 0
                }
            driver_stats[driver_name]['total_mileage'] += log.daily_mileage
            driver_stats[driver_name]['total_hours'] += log.work_hours
            driver_stats[driver_name]['total_days'] += 1
        
        # 車両別統計
        vehicle_stats = {}
        for log in logs:
            vehicle_plate = log.vehicle.自動車登録番号および車両番号 if log.vehicle else f'ID:{log.vehicle_id}'
            if vehicle_plate not in vehicle_stats:
                vehicle_stats[vehicle_plate] = {
                    'total_mileage': 0,
                    'total_hours': 0,
                    'total_days': 0
                }
            vehicle_stats[vehicle_plate]['total_mileage'] += log.daily_mileage
            vehicle_stats[vehicle_plate]['total_hours'] += log.work_hours
            vehicle_stats[vehicle_plate]['total_days'] += 1
        
        result = {
            'period': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat()
            },
            'summary': {
                'total_mileage': total_mileage,
                'total_work_hours': round(total_work_hours, 2),
                'total_days': total_days,
                'average_mileage_per_day': round(total_mileage / total_days, 2) if total_days > 0 else 0,
                'average_hours_per_day': round(total_work_hours / total_days, 2) if total_days > 0 else 0
            },
            'driver_statistics': driver_stats,
            'vehicle_statistics': vehicle_stats
        }
        
        return jsonify(result)
        
    except ValueError as e:
        return jsonify({'error': f'日付形式が正しくありません: {str(e)}'}), 400