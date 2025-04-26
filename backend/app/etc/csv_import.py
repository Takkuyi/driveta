import pandas as pd
from datetime import datetime
from app.extensions import db
from app.etc.models import ETCUsage

def convert_japanese_date(jdate_str):
    era_year, month, day = map(int, jdate_str.split("/"))
    year = 2018 + era_year  # 令和元年=2019
    return datetime(year, month, day).date()

def import_etc_csv(filepath):
    df = pd.read_csv(filepath, encoding="shift_jis")
    df.columns = df.columns.str.strip()  # カラム名の前後スペース除去
    df = df.where(pd.notna(df), None)

    for _, row in df.iterrows():
        try:
            #raw_notes = row.get("備考", "")
            #notes = "" if pd.isna(raw_notes) or (isinstance(raw_notes, float) and math.isnan(raw_notes)) else str(raw_notes)
        
            usage = ETCUsage(
                start_date=convert_japanese_date(row["利用年月日（自）"]),
                start_time=row["時分（自）"],
                end_date=convert_japanese_date(row["利用年月日（至）"]),
                end_time=row["時分（至）"],
                departure_ic=row["利用ＩＣ（自）"],
                arrival_ic=row["利用ＩＣ（至）"],
                original_fee=int(0 if pd.isna(row.get("割引前料金")) else row.get("割引前料金")),
                discount=int(0 if pd.isna(row.get("ＥＴＣ割引額")) else row.get("ＥＴＣ割引額")),
                final_fee=int(0 if pd.isna(row.get("通行料金")) else row.get("通行料金")),
                vehicle_number=str(row["車両番号"]),
                etc_card_number=str(row["ＥＴＣカード番号"]),
                notes=row.get("備考", "")
            )
            db.session.add(usage)

        except Exception as e:
            print(f"❌ 取り込み失敗: {e}")

    db.session.commit()
    print("✅ CSV取り込み完了")
