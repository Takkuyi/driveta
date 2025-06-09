# backend/app/etc/routes.py
from flask import Blueprint, jsonify, request
from sqlalchemy import and_, func, extract
from datetime import datetime, date
from app.extensions import db
from .models import ETCUsage
from app.vehicle.models import Vehicles
import pandas as pd
import io

etc_bp = Blueprint("etc", __name__, url_prefix="/api/etc")

@etc_bp.route("/usage", methods=["GET"])
def list_etc_usage():
    """ETC利用データ一覧を取得"""
    try:
        # クエリパラメータの取得
        vehicle_number = request.args.get("vehicle_number")
        start_date = request.args.get("start_date")
        end_date = request.args.get("end_date")
        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 50, type=int)
        
        # クエリビルダー
        query = ETCUsage.query
        
        # フィルタリング
        if vehicle_number:
            query = query.filter(ETCUsage.vehicle_number.like(f"%{vehicle_number}%"))
        
        if start_date:
            try:
                start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
                query = query.filter(ETCUsage.start_date >= start_date_obj)
            except ValueError:
                return jsonify({"error": "Invalid start_date format. Use YYYY-MM-DD"}), 400
        
        if end_date:
            try:
                end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
                query = query.filter(ETCUsage.end_date <= end_date_obj)
            except ValueError:
                return jsonify({"error": "Invalid end_date format. Use YYYY-MM-DD"}), 400
        
        # ページネーション
        pagination = query.order_by(ETCUsage.start_date.desc(), ETCUsage.start_time.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        # レスポンスデータの構築
        data = []
        for record in pagination.items:
            data.append({
                "id": record.id,
                "start_date": record.start_date.strftime('%Y-%m-%d') if record.start_date else None,
                "start_time": record.start_time,
                "end_date": record.end_date.strftime('%Y-%m-%d') if record.end_date else None,
                "end_time": record.end_time,
                "departure_ic": record.departure_ic,
                "arrival_ic": record.arrival_ic,
                "original_fee": record.original_fee,
                "discount": record.discount,
                "final_fee": record.final_fee,
                "vehicle_number": record.vehicle_number,
                "etc_card_number": record.etc_card_number,
                "notes": record.notes
            })
        
        return jsonify({
            "data": data,
            "pagination": {
                "page": pagination.page,
                "per_page": pagination.per_page,
                "total": pagination.total,
                "pages": pagination.pages,
                "has_next": pagination.has_next,
                "has_prev": pagination.has_prev
            }
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@etc_bp.route("/usage/<int:usage_id>", methods=["GET"])
def get_etc_usage(usage_id):
    """特定のETC利用データを取得"""
    try:
        record = ETCUsage.query.get_or_404(usage_id)
        
        data = {
            "id": record.id,
            "start_date": record.start_date.strftime('%Y-%m-%d') if record.start_date else None,
            "start_time": record.start_time,
            "end_date": record.end_date.strftime('%Y-%m-%d') if record.end_date else None,
            "end_time": record.end_time,
            "departure_ic": record.departure_ic,
            "arrival_ic": record.arrival_ic,
            "original_fee": record.original_fee,
            "discount": record.discount,
            "final_fee": record.final_fee,
            "vehicle_number": record.vehicle_number,
            "etc_card_number": record.etc_card_number,
            "notes": record.notes
        }
        
        return jsonify(data)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@etc_bp.route("/upload", methods=["POST"])
def upload_etc_csv():
    """ETCデータCSVをアップロード"""
    try:
        if 'file' not in request.files:
            return jsonify({"error": "ファイルがありません"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "ファイルが選択されていません"}), 400
        
        if not file.filename.endswith('.csv'):
            return jsonify({"error": "CSVファイルのみアップロード可能です"}), 400
        
        # CSVデータを読み込み（エンコーディングを自動判定）
        content = file.stream.read()
        
        # エンコーディングの検出と読み込み
        try:
            # UTF-8を最初に試行
            csv_content = content.decode('utf-8')
        except UnicodeDecodeError:
            try:
                # Shift_JISを試行
                csv_content = content.decode('shift_jis')
            except UnicodeDecodeError:
                # CP932を試行
                csv_content = content.decode('cp932')
        
        # pandas でCSVを解析
        df = pd.read_csv(io.StringIO(csv_content))
        
        # データの前処理と検証
        if len(df) == 0:
            return jsonify({"error": "CSVファイルにデータがありません"}), 400
        
        imported_count = 0
        error_count = 0
        errors = []
        
        def parse_japanese_date(date_str):
            """日本語の日付フォーマットをパース（yyyy/mm/dd形式）"""
            if pd.isna(date_str) or date_str == '':
                return None
            
            date_str = str(date_str).strip()
            
            # yyyy/mm/dd, yyyy-mm-dd, yyyy.mm.dd のパターンに対応
            for separator in ['/', '-', '.']:
                if separator in date_str:
                    try:
                        parts = date_str.split(separator)
                        if len(parts) == 3:
                            year, month, day = parts
                            # 年が2桁の場合は20xxとする
                            if len(year) == 2:
                                year = '20' + year
                            return datetime.strptime(f"{year}-{month.zfill(2)}-{day.zfill(2)}", '%Y-%m-%d').date()
                    except ValueError:
                        continue
            
            # そのほかのフォーマットを pandas に任せる
            try:
                return pd.to_datetime(date_str, dayfirst=False).date()
            except:
                return None
        
        for index, row in df.iterrows():
            try:
                # 日付の変換（yyyy/mm/dd形式に対応）
                start_date = parse_japanese_date(row.get('利用年月日（自）'))
                end_date = parse_japanese_date(row.get('利用年月日（至）'))
                
                # ICデータの処理（日光本線料金所対応）
                departure_ic = str(row.get('利用ＩＣ（自）', '')).strip()
                arrival_ic = str(row.get('利用ＩＣ（至）', '')).strip()
                
                # 日光本線料金所などで（自）が空の場合はNoneに設定
                if departure_ic == '' or departure_ic == 'nan':
                    departure_ic = None
                if arrival_ic == '' or arrival_ic == 'nan':
                    arrival_ic = None
                
                # ETCUsageレコードの作成
                usage = ETCUsage(
                    start_date=start_date,
                    start_time=str(row.get('時分（自）', '')).strip() if pd.notna(row.get('時分（自）')) else None,
                    end_date=end_date,
                    end_time=str(row.get('時分（至）', '')).strip() if pd.notna(row.get('時分（至）')) else None,
                    departure_ic=departure_ic,
                    arrival_ic=arrival_ic,
                    original_fee=int(float(row.get('割引前料金', 0))) if pd.notna(row.get('割引前料金')) and str(row.get('割引前料金')).strip() != '' else 0,
                    discount=int(float(row.get('ＥＴＣ割引額', 0))) if pd.notna(row.get('ＥＴＣ割引額')) and str(row.get('ＥＴＣ割引額')).strip() != '' else 0,
                    final_fee=int(float(row.get('通行料金', 0))) if pd.notna(row.get('通行料金')) and str(row.get('通行料金')).strip() != '' else 0,
                    vehicle_number=str(row.get('車両番号', '')).strip() if pd.notna(row.get('車両番号')) else '',
                    etc_card_number=str(row.get('ＥＴＣカード番号', '')).strip() if pd.notna(row.get('ＥＴＣカード番号')) else '',
                    notes=str(row.get('備考', '')).strip() if pd.notna(row.get('備考')) else ''
                )
                
                db.session.add(usage)
                imported_count += 1
                
            except Exception as e:
                error_count += 1
                errors.append(f"行 {index + 2}: {str(e)}")
                print(f"Error processing row {index + 2}: {e}")  # デバッグ用
        
        # データベースにコミット
        db.session.commit()
        
        return jsonify({
            "message": f"CSVインポートが完了しました",
            "imported_count": imported_count,
            "error_count": error_count,
            "errors": errors[:10]  # 最初の10件のエラーのみ返す
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"CSVインポートエラー: {str(e)}"}), 500

@etc_bp.route("/statistics", methods=["GET"])
def get_etc_statistics():
    """ETC利用統計を取得"""
    try:
        # クエリパラメータ
        start_date = request.args.get("start_date")
        end_date = request.args.get("end_date")
        vehicle_number = request.args.get("vehicle_number")
        
        # 基本クエリ
        query = ETCUsage.query
        
        # フィルタリング
        if start_date:
            start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
            query = query.filter(ETCUsage.start_date >= start_date_obj)
        
        if end_date:
            end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
            query = query.filter(ETCUsage.end_date <= end_date_obj)
        
        if vehicle_number:
            query = query.filter(ETCUsage.vehicle_number.like(f"%{vehicle_number}%"))
        
        # 統計情報の計算
        records = query.all()
        
        total_usage = len(records)
        total_amount = sum(record.final_fee or 0 for record in records)
        total_discount = sum(record.discount or 0 for record in records)
        
        # 車両別統計
        vehicle_stats = {}
        for record in records:
            if record.vehicle_number not in vehicle_stats:
                vehicle_stats[record.vehicle_number] = {
                    "usage_count": 0,
                    "total_amount": 0,
                    "total_discount": 0
                }
            
            vehicle_stats[record.vehicle_number]["usage_count"] += 1
            vehicle_stats[record.vehicle_number]["total_amount"] += record.final_fee or 0
            vehicle_stats[record.vehicle_number]["total_discount"] += record.discount or 0
        
        # 月別統計
        monthly_stats = {}
        for record in records:
            if record.start_date:
                month_key = record.start_date.strftime('%Y-%m')
                if month_key not in monthly_stats:
                    monthly_stats[month_key] = {
                        "usage_count": 0,
                        "total_amount": 0,
                        "total_discount": 0
                    }
                
                monthly_stats[month_key]["usage_count"] += 1
                monthly_stats[month_key]["total_amount"] += record.final_fee or 0
                monthly_stats[month_key]["total_discount"] += record.discount or 0
        
        return jsonify({
            "summary": {
                "total_usage": total_usage,
                "total_amount": total_amount,
                "total_discount": total_discount,
                "average_amount": total_amount / total_usage if total_usage > 0 else 0
            },
            "vehicle_stats": [
                {
                    "vehicle_number": k,
                    **v
                }
                for k, v in vehicle_stats.items()
            ],
            "monthly_stats": [
                {
                    "month": k,
                    **v
                }
                for k, v in sorted(monthly_stats.items())
            ]
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@etc_bp.route("/vehicle-summary", methods=["GET"])
def get_vehicle_summary():
    """車両別ETC利用状況サマリーを取得"""
    try:
        # 日付範囲の取得
        start_date = request.args.get("start_date")
        end_date = request.args.get("end_date")
        
        # 基本クエリ
        query = db.session.query(
            ETCUsage.vehicle_number,
            func.count(ETCUsage.id).label('usage_count'),
            func.sum(ETCUsage.final_fee).label('total_amount'),
            func.sum(ETCUsage.discount).label('total_discount'),
            func.max(ETCUsage.start_date).label('last_usage_date')
        ).group_by(ETCUsage.vehicle_number)
        
        # 日付フィルタリング
        if start_date:
            start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
            query = query.filter(ETCUsage.start_date >= start_date_obj)
        
        if end_date:
            end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
            query = query.filter(ETCUsage.end_date <= end_date_obj)
        
        results = query.order_by(func.sum(ETCUsage.final_fee).desc()).all()
        
        data = []
        for result in results:
            data.append({
                "vehicle_number": result.vehicle_number,
                "usage_count": result.usage_count,
                "total_amount": result.total_amount or 0,
                "total_discount": result.total_discount or 0,
                "average_amount": (result.total_amount or 0) / result.usage_count if result.usage_count > 0 else 0,
                "last_usage_date": result.last_usage_date.strftime('%Y-%m-%d') if result.last_usage_date else None
            })
        
        return jsonify(data)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500