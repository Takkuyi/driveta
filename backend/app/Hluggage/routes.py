from datetime import datetime, timedelta
from flask import Blueprint, jsonify, request
from app.Hluggage.models import db, CrateWeights, CourseGroups, Courses, Clients, LoadingData, LoadingMethods
from sqlalchemy import func, case

routes_bp = Blueprint("routes", __name__)

# 🔹 全テーブルリスト（テーブル名: クラス名）
TABLES = {
    "crate_weights": CrateWeights,
    "course_groups": CourseGroups,
    "courses": Courses,
    "clients": Clients,
    "loading_methods": LoadingMethods,
    "loading_data": LoadingData,
}

# ✅ すべてのレコードを取得（GET /テーブル名）
@routes_bp.route("/<table_name>", methods=["GET"])
def get_all_records(table_name):
    if table_name not in TABLES:
        return jsonify({"error": "Invalid table name"}), 404

    model = TABLES[table_name]
    records = model.query.all()

    return jsonify([record.to_dict() for record in records]), 200

# ✅ 新規レコードを追加（POST /テーブル名）
@routes_bp.route("/<table_name>", methods=["POST"])
def create_record(table_name):
    if table_name not in TABLES:
        return jsonify({"error": "Invalid table name"}), 404

    model = TABLES[table_name]
    data = request.json

    try:
        new_record = model(**data)
        db.session.add(new_record)
        db.session.commit()
        return jsonify({"message": f"Record added to {table_name}"}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400

# ✅ レコードを更新（PUT /テーブル名/<id>）
@routes_bp.route("/<table_name>/<int:id>", methods=["PUT"])
def update_record(table_name, id):
    if table_name not in TABLES:
        return jsonify({"error": "Invalid table name"}), 404

    model = TABLES[table_name]
    record = model.query.get(id)

    if not record:
        return jsonify({"error": "Record not found"}), 404

    data = request.json
    for key, value in data.items():
        setattr(record, key, value)

    try:
        db.session.commit()
        return jsonify({"message": f"Record in {table_name} updated"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400

# ✅ レコードを削除（DELETE /テーブル名/<id>）
@routes_bp.route("/<table_name>/<int:id>", methods=["DELETE"])
def delete_record(table_name, id):
    if table_name not in TABLES:
        return jsonify({"error": "Invalid table name"}), 404

    model = TABLES[table_name]
    record = model.query.get(id)

    if not record:
        return jsonify({"error": "Record not found"}), 404

    try:
        db.session.delete(record)
        db.session.commit()
        return jsonify({"message": f"Record in {table_name} deleted"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400

#@routes_bp.route("/loading_data/date/<string:date_str>", methods=["GET"])
#def get_loading_data_by_date(date_str):
 #   """指定した日付の積込量データを取得するAPI"""
  #  try:
   #     target_date = datetime.strptime(date_str, "%Y-%m-%d")
    #except ValueError:
     #   return jsonify({"エラー": "無効な日付形式。YYYY-MM-DD で指定してください"}), 400

#    start_of_day = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
#    end_of_day = target_date.replace(hour=23, minute=59, second=59, microsecond=999999)

#    records = LoadingData.query.filter(
#        LoadingData.fld_仕分日 >= start_of_day,
#        LoadingData.fld_仕分日 <= end_of_day
#    ).all()

#    return jsonify([record.to_dict() for record in records]), 200

@routes_bp.route("/loading_data/date/<string:date_str>", methods=["GET"])
def get_loading_data_by_date(date_str):
    """指定した日付の積込量データを取得するAPI"""
    try:
        target_date = datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        return jsonify({"エラー": "無効な日付形式。YYYY-MM-DD で指定してください"}), 400

    start_of_day = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day = target_date.replace(hour=23, minute=59, second=59, microsecond=999999)

    records = LoadingData.query.filter(
        LoadingData.fld_仕分日 >= start_of_day,
        LoadingData.fld_仕分日 <= end_of_day
    ).all()

    results = db.session.query(
        LoadingData.fld_積込量ID,
        LoadingData.fld_仕分日,
        LoadingData.fld_コースID,
        Courses.fld_コース名,  # コース名を取得
        LoadingData.fld_赤クレート数,
        LoadingData.fld_平クレート数,
        LoadingData.fld_青クレート数,
        LoadingData.fld_段ボール数,
        LoadingData.fld_学乳数,
        LoadingData.fld_データ入力日
    ).join(Courses, LoadingData.fld_コースID == Courses.fld_コースID)\
    .filter(LoadingData.fld_仕分日 >= start_of_day, LoadingData.fld_仕分日 <= end_of_day)\
    .all()

    # 結果を JSON 形式で返す
    data = [
        {
            "fld_積込量ID": r.fld_積込量ID,
            "fld_仕分日": r.fld_仕分日.strftime("%Y-%m-%d") if r.fld_仕分日 else None,
            "fld_コースID": r.fld_コースID,
            "fld_コース名": r.fld_コース名,
            "fld_赤クレート数": r.fld_赤クレート数,
            "fld_平クレート数": r.fld_平クレート数,
            "fld_青クレート数": r.fld_青クレート数,
            "fld_段ボール数": r.fld_段ボール数,
            "fld_学乳数": r.fld_学乳数,
            "fld_データ入力日": r.fld_データ入力日.strftime("%Y-%m-%d") if r.fld_データ入力日 else None,
        }
        for r in results
    ]

    return jsonify(data)
    
@routes_bp.route("/loading_data/summary/<string:date_str>", methods=["GET"])
def get_loading_data_summary(date_str):
    """指定した日付の積込量データの集計を取得するAPI"""
    try:
        target_date = datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        return jsonify({"エラー": "無効な日付形式。YYYY-MM-DD で指定してください"}), 400

    start_of_day = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day = target_date.replace(hour=23, minute=59, second=59, microsecond=999999)

    # JOIN しつつ、日付でフィルタリングし、集計
    results = db.session.query(
        LoadingData.fld_データ入力日,
        LoadingData.fld_仕分日,
        Courses.fld_KR便名.label("fld_コース名"),
        func.count().label("指示書枚数"),
        func.sum(
            LoadingData.fld_赤クレート数 +
            LoadingData.fld_平クレート数 +
            LoadingData.fld_青クレート数 +
            LoadingData.fld_段ボール数 +
            LoadingData.fld_学乳数
        ).label("クレート合計"),
        func.sum(LoadingData.fld_赤クレート数).label("赤クレート合計"),
        func.sum(LoadingData.fld_平クレート数).label("平クレート合計"),
        func.sum(LoadingData.fld_青クレート数).label("青クレート合計"),
        func.sum(LoadingData.fld_段ボール数).label("段ボール合計"),
        func.sum(LoadingData.fld_学乳数).label("学乳数合計"),
        func.sum(
            (LoadingData.fld_赤クレート数 * 13.5) +
            (LoadingData.fld_平クレート数 * 2.2) +
            (LoadingData.fld_青クレート数 * 5.5) +
            (LoadingData.fld_段ボール数 * 2.6)
        ).label("重量合計"),
        func.sum(
            func.round(LoadingData.fld_赤クレート数 / LoadingMethods.fld_赤PL, 1)
        ).label("赤PL枚数"),
        func.sum(
            func.round(LoadingData.fld_平クレート数 / LoadingMethods.fld_平PL, 1)
        ).label("平PL枚数"),
        func.sum(
            func.round(LoadingData.fld_青クレート数 / LoadingMethods.fld_青PL, 1)
        ).label("青PL枚数"),
        func.sum(
            case(
                (LoadingMethods.fld_段PL == 0, 0),  # IIf(M_積み方マスタ.fld_段PL = 0, 0, ...)
                else_=func.round(LoadingData.fld_段ボール数 / LoadingMethods.fld_段PL, 1)
            )
        ).label("段PL枚数"),
        (
            func.sum(func.round(LoadingData.fld_赤クレート数 / LoadingMethods.fld_赤PL, 1)) +
            func.sum(func.round(LoadingData.fld_平クレート数 / LoadingMethods.fld_平PL, 1)) +
            func.sum(func.round(LoadingData.fld_青クレート数 / LoadingMethods.fld_青PL, 1)) +
            func.sum(
                case(
                    (LoadingMethods.fld_段PL == 0, 0),
                    else_=func.round(LoadingData.fld_段ボール数 / LoadingMethods.fld_段PL, 1)
                )
            )
        ).label("総PL枚数")
    ).join(Courses, LoadingData.fld_コースID == Courses.fld_コースID) \
     .join(LoadingMethods, Courses.fld_積み方ID == LoadingMethods.fld_積み方ID) \
     .filter(LoadingData.fld_データ入力日 >= start_of_day, LoadingData.fld_データ入力日 <= end_of_day) \
     .group_by(LoadingData.fld_データ入力日, LoadingData.fld_仕分日, Courses.fld_KR便名) \
     .order_by(Courses.fld_KR便名) \
     .all()

    # 結果を JSON 形式で返す
    data = [
        {
            "fld_データ入力日": r.fld_データ入力日.strftime("%Y-%m-%d") if r.fld_データ入力日 else None,
            "fld_仕分日": r.fld_仕分日.strftime("%Y-%m-%d") if r.fld_仕分日 else None,
            "fld_コース名": r.fld_コース名,
            "指示書枚数": r.指示書枚数,
            "クレート合計": r.クレート合計,
            "赤クレート合計": r.赤クレート合計,
            "平クレート合計": r.平クレート合計,
            "青クレート合計": r.青クレート合計,
            "段ボール合計": r.段ボール合計,
            "学乳数合計": r.学乳数合計,
            "重量合計": r.重量合計,
            "赤PL枚数": r.赤PL枚数,
            "平PL枚数": r.平PL枚数,
            "青PL枚数": r.青PL枚数,
            "段PL枚数": r.段PL枚数,
            "総PL枚数": r.総PL枚数,
        }
        for r in results
    ]

    return jsonify(data)