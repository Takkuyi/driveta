import os
import csv
from app import create_app
from app.extensions import db
from backend.app.vehicle import Vehicles

app = create_app()

CSV_DIR = "tmp"  # tmpディレクトリ内のCSVを処理
def import_vehicle_csv():
    print("\U0001F680 現在の環境: development")

    for filename in os.listdir(CSV_DIR):
        if filename.endswith(".csv"):
            filepath = os.path.join(CSV_DIR, filename)
            print(f"\U0001F4C4 処理中: {filename}")

            try:
                with open(filepath, newline='', encoding='utf-8') as csvfile:
                    reader = csv.DictReader(csvfile)

                    for row in reader:
                        vehicle = Vehicles.from_csv_row(row)

                        # 車両番号がなければスキップ（主キー扱い）
                        if not vehicle.vehicle_number:
                            print(f"⚠️  スキップ: 車両番号が空 - {row}")
                            continue

                        # すでに同じ車両番号が存在する場合はスキップ or 上書きも可
                        existing = Vehicles.query.filter_by(vehicle_number=vehicle.vehicle_number).first()
                        if existing:
                            print(f"↩️  既存レコードあり: {vehicle.vehicle_number}")
                            continue

                        db.session.add(vehicle)

                    db.session.commit()
                    print(f"✅ インポート完了: {filename}")

            except Exception as e:
                print(f"❌ ファイル読み込み失敗: {filename} - {e}")

if __name__ == "__main__":
    with app.app_context():
        import_vehicle_csv()
        