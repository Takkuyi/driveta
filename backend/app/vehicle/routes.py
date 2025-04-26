from flask import Blueprint, jsonify
from app.vehicle.models import ICVehicleRaw  # モデルのパスに合わせて調整してください
from app.extensions import db

vehicle_bp = Blueprint('vehicle', __name__, url_prefix='/api/vehicles')

@vehicle_bp.route('/', methods=['GET'])
def list_vehicles():
    vehicles = Vehicle.query.order_by(Vehicle.id).all()
    result = [
        {
            "id": v.id,
            "vehicle_number": v.vehicle_number,
            "registration_number": v.registration_number,
            "chassis_number": v.chassis_number,
            "vehicle_type": v.vehicle_type,
            "car_type": v.car_type,
            "usage": v.usage,
            "ownership": v.ownership,
            "ownership_type": v.ownership_type,
            "body_style": v.body_style,
            "car_name": v.car_name,
            "model": v.model,
            "engine_model": v.engine_model,
            "length": v.length,
            "width": v.width,
            "height": v.height,
            "vehicle_weight": v.vehicle_weight,
            "gross_weight": v.gross_weight,
            "max_load_capacity": v.max_load_capacity,
            "max_load": v.max_load,
            "seating_capacity": v.seating_capacity,
            "classification": v.classification,
            "name": v.name,
            "gross_vehicle_weight": v.gross_vehicle_weight,
            "capacity": v.capacity
        }
        for v in vehicles
    ]
    return jsonify(result)
