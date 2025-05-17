from flask import Blueprint, jsonify
from app.vehicle.models import Vehicles
from app.extensions import db

vehicle_bp = Blueprint('vehicle', __name__, url_prefix='/api/vehicles')

@vehicle_bp.route('/', methods=['GET'])
def list_vehicles():
    vehicles = Vehicles.query.order_by(Vehicles.id).all()
    result = [
        {
            "車両番号": v.自動車登録番号および車両番号,
            "車台番号": v.車台番号,
            "原動機型式": v.原動機型式,
            "型式": v.型式,
            "初年度登録年月": v.初年度登録年月,
            "型式指定番号_種別区分番号": v.型式指定番号_種別区分番号,
            "有効期間の満了する日": v.有効期間の満了する日,
            "保安基準適用年月日": v.保安基準適用年月日,
            "燃料の種類コード": v.燃料の種類コード,
            "騒音規制": v.騒音規制,
            "近接排気騒音規制値": v.近接排気騒音規制値,
            "駆動方式": v.駆動方式,
            "オパシメータ測定車": v.オパシメータ測定車,
            "NOx値": v.NOx値,
            "PM値": v.PM値,
            "NOx_PM測定モード": v.NOx_PM測定モード,
            "軸重_前前_": v.軸重_前前_,
            "軸重_前後_": v.軸重_前後_,
            "軸重_後前_": v.軸重_後前_,
            "軸重_後後_": v.軸重_後後_,
            "バージョン情報_二次元コード２_": v.バージョン情報_二次元コード２_,
            "バージョン情報_二次元コード３_": v.バージョン情報_二次元コード３_,
            "帳票種別": v.帳票種別,
            "ナンバープレート区分": v.ナンバープレート区分,
            "車台番号打刻位置": v.車台番号打刻位置
        }
        for v in vehicles
    ]
    return jsonify(result)
