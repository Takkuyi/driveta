from flask import Blueprint, jsonify, request
from sqlalchemy import and_
from datetime import datetime
from app.extensions import db
from .models import ETCUsage

routes_bp = Blueprint("etc", __name__, url_prefix="/etc")


def list_etc_usage():
    query = ETCUsage.query.join(Vehicle, ETCUsage.vehicle_number == Vehicle.vehicle_number)

    vehicle_number = request.args.get("vehicle_number")
    if vehicle_number:
        query = query.filter(ETCUsage.vehicle_number == vehicle_number)

    results = query.all()

    data = []
    for record in results:
        data.append({
            "id": record.id,
            "start_date": record.start_date.strftime('%Y-%m-%d'),
            "start_time": record.start_time,
            "end_date": record.end_date.strftime('%Y-%m-%d'),
            "end_time": record.end_time,
            "departure_ic": record.departure_ic,
            "arrival_ic": record.arrival_ic,
            "original_fee": record.original_fee,
            "discount": record.discount,
            "final_fee": record.final_fee,
            "etc_card_number": record.etc_card_number,
            "vehicle_number": record.vehicle_number,
            "vehicle_description": record.vehicle.description if record.vehicle else None,
            "notes": record.notes
        })

    return jsonify(data)