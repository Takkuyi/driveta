# backend/app/vehicle/routes.py (完全修正版)

from flask import Blueprint, jsonify, request
from sqlalchemy.exc import SQLAlchemyError
from app.vehicle.models import Vehicles
from app.extensions import db

vehicle_bp = Blueprint('vehicle', __name__, url_prefix='/api/vehicles')

@vehicle_bp.route('/', methods=['GET'])
def list_vehicles():
    vehicles = Vehicles.query.order_by(Vehicles.id).all()
    result = [
        {
            "id": v.id,
            "plate": v.自動車登録番号および車両番号,            # registration_plate
            "type": v.車台番号,                               # chassis_number
            "model": v.原動機型式,                            # engine_model
            "number": v.型式,                                # model_code
            "year": v.初年度登録年月,                         # first_registration_date
            "model_designation_number": v.型式指定番号_種別区分番号,  # model_designation_number
            "expiry_date": v.有効期間の満了する日,              # expiry_date
            "safety_standard_date": v.保安基準適用年月日,       # safety_standard_date
            "fuel_type_code": v.燃料の種類コード,              # fuel_type_code
            "noise_regulation": v.騒音規制,                  # noise_regulation
            "proximity_exhaust_noise_limit": v.近接排気騒音規制値, # proximity_exhaust_noise_limit
            "drive_system": v.駆動方式,                      # drive_system
            "opacimeter_measured_vehicle": v.オパシメータ測定車, # opacimeter_measured_vehicle
            "nox_value": v.NOx値,                           # nox_value
            "pm_value": v.PM値,                             # pm_value
            "nox_pm_measurement_mode": v.NOx_PM測定モード,    # nox_pm_measurement_mode
            "axle_weight_front_front": v.軸重_前前_,          # axle_weight_front_front
            "axle_weight_front_rear": v.軸重_前後_,           # axle_weight_front_rear
            "axle_weight_rear_front": v.軸重_後前_,           # axle_weight_rear_front
            "axle_weight_rear_rear": v.軸重_後後_,            # axle_weight_rear_rear
            "version_info_qr_code_2": v.バージョン情報_二次元コード２_, # version_info_qr_code_2
            "version_info_qr_code_3": v.バージョン情報_二次元コード３_, # version_info_qr_code_3
            "document_type": v.帳票種別,                      # document_type
            "plate_classification": v.ナンバープレート区分,      # plate_classification
            "chassis_number_stamping_position": v.車台番号打刻位置, # chassis_number_stamping_position
            "status": v.ステータス,                           # status
            "manufacturer": v.車名                           # manufacturer
        }
        for v in vehicles
    ]
    return jsonify(result)

@vehicle_bp.route('/', methods=['POST'])
def create_vehicle():
    """新規車両の登録"""
    data = request.json
    
    # 必須フィールドの検証
    required_fields = ['自動車登録番号および車両番号', '車台番号']
    for field in required_fields:
        if field not in data or not data[field]:
            return jsonify({'error': f'必須フィールド "{field}" がありません'}), 400
    
    try:
        # 重複チェック
        existing_vehicle = Vehicles.query.filter_by(
            自動車登録番号および車両番号=data['自動車登録番号および車両番号']
        ).first()
        
        if existing_vehicle:
            return jsonify({'error': 'このナンバープレートの車両は既に登録されています'}), 400
        
        # 新規車両の作成
        new_vehicle = Vehicles(
            自動車登録番号および車両番号=data.get('自動車登録番号および車両番号'),
            車台番号=data.get('車台番号'),
            原動機型式=data.get('原動機型式'),
            型式=data.get('型式'),
            初年度登録年月=data.get('初年度登録年月'),
            車名=data.get('車名'),
            有効期間の満了する日=data.get('有効期間の満了する日'),
            ステータス=data.get('ステータス', '運行中'),
            燃料の種類コード=data.get('燃料の種類コード'),
            騒音規制=data.get('騒音規制'),
            駆動方式=data.get('駆動方式')
        )
        
        db.session.add(new_vehicle)
        db.session.commit()
        
        return jsonify({
            'id': new_vehicle.id,
            'message': '車両を登録しました',
            'plate': new_vehicle.自動車登録番号および車両番号
        }), 201
        
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({'error': f'データベースエラー: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'登録エラー: {str(e)}'}), 500

@vehicle_bp.route('/<int:vehicle_id>/', methods=['GET'])
def get_vehicle(vehicle_id):
    vehicle = Vehicles.query.get_or_404(vehicle_id)
    result = {
        "id": vehicle.id,
        "plate": vehicle.自動車登録番号および車両番号,           # registration_plate
        "number": vehicle.車台番号,                              # chassis_number
        "model": vehicle.原動機型式,                           # engine_model
        "type": vehicle.型式,                               # model_type
        "year": vehicle.初年度登録年月,                        # first_registration_date
        "model_designation_number": vehicle.型式指定番号_種別区分番号,  # model_designation_number
        "expiry_date": vehicle.有効期間の満了する日,             # expiry_date
        "safety_standard_date": vehicle.保安基準適用年月日,      # safety_standard_date
        "fuel_type_code": vehicle.燃料の種類コード,             # fuel_type_code
        "noise_regulation": vehicle.騒音規制,                 # noise_regulation
        "proximity_exhaust_noise_limit": vehicle.近接排気騒音規制値, # proximity_exhaust_noise_limit
        "drive_system": vehicle.駆動方式,                     # drive_system
        "opacimeter_measured_vehicle": vehicle.オパシメータ測定車, # opacimeter_measured_vehicle
        "nox_value": vehicle.NOx値,                          # nox_value
        "pm_value": vehicle.PM値,                            # pm_value
        "nox_pm_measurement_mode": vehicle.NOx_PM測定モード,   # nox_pm_measurement_mode
        "axle_weight_front_front": vehicle.軸重_前前_,         # axle_weight_front_front
        "axle_weight_front_rear": vehicle.軸重_前後_,          # axle_weight_front_rear
        "axle_weight_rear_front": vehicle.軸重_後前_,          # axle_weight_rear_front
        "axle_weight_rear_rear": vehicle.軸重_後後_,           # axle_weight_rear_rear
        "version_info_qr_code_2": vehicle.バージョン情報_二次元コード２_, # version_info_qr_code_2
        "version_info_qr_code_3": vehicle.バージョン情報_二次元コード３_, # version_info_qr_code_3
        "document_type": vehicle.帳票種別,                     # document_type
        "plate_classification": vehicle.ナンバープレート区分,     # plate_classification
        "chassis_number_stamping_position": vehicle.車台番号打刻位置, # chassis_number_stamping_position
        "status": vehicle.ステータス,                          # status
        "manufacturer": vehicle.車名                          # manufacturer
    }
    return jsonify(result)

@vehicle_bp.route('/<int:vehicle_id>/', methods=['PUT'])
def update_vehicle(vehicle_id):
    """車両情報の更新"""
    vehicle = Vehicles.query.get_or_404(vehicle_id)
    data = request.json
    
    try:
        # 更新可能なフィールドを更新
        if '自動車登録番号および車両番号' in data:
            vehicle.自動車登録番号および車両番号 = data['自動車登録番号および車両番号']
        if '車台番号' in data:
            vehicle.車台番号 = data['車台番号']
        if '原動機型式' in data:
            vehicle.原動機型式 = data['原動機型式']
        if '型式' in data:
            vehicle.型式 = data['型式']
        if '初年度登録年月' in data:
            vehicle.初年度登録年月 = data['初年度登録年月']
        if '車名' in data:
            vehicle.車名 = data['車名']
        if '有効期間の満了する日' in data:
            vehicle.有効期間の満了する日 = data['有効期間の満了する日']
        if 'ステータス' in data:
            vehicle.ステータス = data['ステータス']
        if '燃料の種類コード' in data:
            vehicle.燃料の種類コード = data['燃料の種類コード']
        if '騒音規制' in data:
            vehicle.騒音規制 = data['騒音規制']
        if '駆動方式' in data:
            vehicle.駆動方式 = data['駆動方式']
        
        db.session.commit()
        
        return jsonify({
            'id': vehicle.id,
            'message': '車両情報を更新しました',
            'plate': vehicle.自動車登録番号および車両番号
        })
        
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({'error': f'データベースエラー: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'更新エラー: {str(e)}'}), 500

@vehicle_bp.route('/<int:vehicle_id>/', methods=['DELETE'])
def delete_vehicle(vehicle_id):
    """車両の削除"""
    vehicle = Vehicles.query.get_or_404(vehicle_id)
    
    try:
        # 関連する整備記録や運転日報がある場合は削除を拒否
        # （実際の実装では、関連データの確認が必要）
        
        db.session.delete(vehicle)
        db.session.commit()
        
        return jsonify({
            'message': f'車両「{vehicle.自動車登録番号および車両番号}」を削除しました'
        })
        
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({'error': f'データベースエラー: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'削除エラー: {str(e)}'}), 500

@vehicle_bp.route('/<int:vehicle_id>/maintenance/', methods=['GET'])
def list_vehicle_maintenance(vehicle_id):
    """車両の整備履歴取得"""
    # 車両が存在するか確認
    vehicle = Vehicles.query.get_or_404(vehicle_id)
    
    # 整備記録を取得（maintenance_schedulesテーブルから）
    try:
        from app.maintenance.models import MaintenanceSchedule
        
        maintenance_records = MaintenanceSchedule.query.filter_by(
            vehicle_id=vehicle_id
        ).order_by(MaintenanceSchedule.scheduled_date.desc()).all()
        
        result = []
        for record in maintenance_records:
            result.append({
                'id': record.id,
                'maintenance_type': {
                    'id': record.maintenance_type_id,
                    'name': record.maintenance_type.name if record.maintenance_type else None
                },
                'scheduled_date': record.scheduled_date.isoformat() if record.scheduled_date else None,
                'completion_date': record.completion_date.isoformat() if record.completion_date else None,
                'status': {
                    'id': record.status_id,
                    'name': record.status.name if record.status else None
                },
                'technician': record.technician,
                'location': record.location,
                'cost': float(record.cost) if record.cost else None,
                'notes': record.notes
            })
        
        return jsonify(result)
        
    except ImportError:
        # 整備記録モデルがまだない場合は空の配列を返す
        return jsonify([])
    except Exception as e:
        return jsonify({'error': f'整備履歴取得エラー: {str(e)}'}), 500

@vehicle_bp.route('/statistics/', methods=['GET'])
def get_vehicle_statistics():
    """車両統計情報取得"""
    try:
        # 車両数の統計
        total_vehicles = Vehicles.query.count()
        active_vehicles = Vehicles.query.filter_by(ステータス='運行中').count()
        maintenance_vehicles = Vehicles.query.filter_by(ステータス='整備中').count()
        standby_vehicles = Vehicles.query.filter_by(ステータス='待機中').count()
        retired_vehicles = Vehicles.query.filter_by(ステータス='廃車').count()
        
        # メーカー別統計
        manufacturer_stats = {}
        vehicles_by_manufacturer = Vehicles.query.with_entities(
            Vehicles.車名, 
            db.func.count(Vehicles.id).label('count')
        ).group_by(Vehicles.車名).all()
        
        for manufacturer, count in vehicles_by_manufacturer:
            if manufacturer:
                manufacturer_stats[manufacturer] = count
        
        # 年式別統計
        year_stats = {}
        vehicles_by_year = Vehicles.query.with_entities(
            Vehicles.初年度登録年月,
            db.func.count(Vehicles.id).label('count')
        ).group_by(Vehicles.初年度登録年月).all()
        
        for year, count in vehicles_by_year:
            if year:
                year_stats[str(year)] = count
        
        result = {
            'summary': {
                'total_vehicles': total_vehicles,
                'active_vehicles': active_vehicles,
                'maintenance_vehicles': maintenance_vehicles,
                'standby_vehicles': standby_vehicles,
                'retired_vehicles': retired_vehicles
            },
            'manufacturer_statistics': manufacturer_stats,
            'year_statistics': year_stats
        }
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': f'統計情報取得エラー: {str(e)}'}), 500