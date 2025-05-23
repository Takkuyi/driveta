from flask import Blueprint, jsonify
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

@vehicle_bp.route('/<int:vehicle_id>/maintenance/', methods=['GET'])
def list_vehicle_maintenance(vehicle_id):
    # 車両が存在するか確認
    vehicle = Vehicles.query.get_or_404(vehicle_id)
    
    # 現時点では整備履歴モデルがない場合はダミーデータを返す
    # 本来はデータベースから取得する
    maintenance_records = []
    
    # ここは後でMaintenanceモデルからデータを取得するよう修正する
    # 例: maintenance_records = Maintenance.query.filter_by(vehicle_id=vehicle_id).all()
    
    return jsonify(maintenance_records)
