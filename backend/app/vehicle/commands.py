import click
import pandas as pd
from flask.cli import with_appcontext
from app import db
from models import Vehicles

def clean_value(value):
    if pd.isna(value) or value == '-' or str(value).strip() == '':
        return None
    try:
        return float(value)
    except ValueError:
        return value

@click.group()
def vehicle():
    """Vehicle関連のCLI"""
    pass

@vehicle.command("import-csv")
@with_appcontext
def import_csv():
    """CSVファイルから車両データを読み込み"""
    df = pd.read_csv("tmp/car.csv")
    click.echo(f"🚛 レコード数: {len(df)}")

    for _, row in df.iterrows():
        data = row.to_dict()
        clean_data = {k: (None if pd.isna(v) else v) for k, v in data.items()}

        vehicle = Vehicles(
            状態=clean_data.get("状態"),
            車番=clean_data.get("車番"),
            車格=clean_data.get("車格"),
            重量=clean_value(clean_data.get("重量")),
            初年度登録=clean_value(clean_data.get("初年度登録")),
            車検満了日=clean_value(clean_data.get("車検満了日")),
            車名=clean_data.get("車名"),
            車台番号=clean_data.get("車台番号"),
            車両形式=clean_data.get("車両形式"),
            原動機型式=clean_data.get("原動機型式"),
            用途=clean_data.get("用途"),
            自家_事業=None,
            車体の形状=None,
            乗車定員=clean_value(clean_data.get("乗車定員")),
            最大積載量=clean_value(clean_data.get("最大積載量")),
            車両総重量=clean_value(clean_data.get("車両総重量")),
            長さ=clean_value(clean_data.get("長さ")),
            幅=clean_value(clean_data.get("幅")),
            高さ=clean_value(clean_data.get("高さ")),
            前前軸重=clean_value(clean_data.get("前前軸重")),
            前後軸重=clean_value(clean_data.get("前後軸重")),
            後前軸重=clean_value(clean_data.get("後前軸重")),
            後後軸重=clean_value(clean_data.get("後後軸重")),
            排気気量=clean_value(clean_data.get("排気気量")),
            燃料=clean_data.get("燃料")
        )
        db.session.add(vehicle)

    db.session.commit()
    click.echo("✅ インポート完了しました！")
