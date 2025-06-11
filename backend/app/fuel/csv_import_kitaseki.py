# backend/app/fuel/csv_import.py

import os
import sys
import pandas as pd
from datetime import datetime
from flask import current_app
from sqlalchemy import and_

from app.extensions import db
from app.fuel.models import KitasekiRecord
from app.fuel.encoding_utils import try_multiple_encodings

def import_kitaseki_csv_from_file(file_path, batch_size=100):
    """
    キタセキ社CSVファイルを直接インポートする関数
    
    Args:
        file_path (str): CSVファイルのパス
        batch_size (int): バッチサイズ（デフォルト100件）
        
    Returns:
        dict: インポート結果
    """
    
    if not os.path.exists(file_path):
        raise FileNotFoundError(f'ファイルが見つかりません: {file_path}')
    
    print(f"📁 ファイル読み込み開始: {file_path}")
    
    try:
        # エンコーディング自動検出でCSVを読み込み
        df, successful_encoding = try_multiple_encodings(file_path)
        print(f"✅ エンコーディング検出成功: {successful_encoding}")
        
        # データの前処理
        df = df.fillna('')  # NaNを空文字に変換
        
        # 統計情報の初期化
        total_rows = len(df)
        imported_count = 0
        skipped_count = 0
        error_count = 0
        errors = []
        
        print(f"📊 総行数: {total_rows}")
        
        # 既存データとの重複チェック用
        existing_records = set()
        
        # インポートバッチIDを生成
        batch_id = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        for index, row in df.iterrows():
            try:
                # 進捗表示（100件ごと）
                if (index + 1) % 100 == 0:
                    print(f"⏳ 処理中: {index + 1}/{total_rows} 行")
                
                # KitasekiRecordインスタンスを作成
                record = KitasekiRecord.from_csv_row(row.to_dict())
                
                # 基本的なバリデーション
                if not record or not record.transaction_date or not record.vehicle_number:
                    skipped_count += 1
                    continue
                
                # インポートバッチIDを設定
                record.import_batch_id = batch_id
                
                # 重複チェック（日付、車番、伝票番号、行番号で判定）
                duplicate_key = (
                    record.transaction_date,
                    record.vehicle_number,
                    record.voucher_number,
                    record.line_number
                )
                
                if duplicate_key in existing_records:
                    skipped_count += 1
                    continue
                
                # DBでの重複チェック
                existing = KitasekiRecord.query.filter(
                    and_(
                        KitasekiRecord.transaction_date == record.transaction_date,
                        KitasekiRecord.vehicle_number == record.vehicle_number,
                        KitasekiRecord.voucher_number == record.voucher_number,
                        KitasekiRecord.line_number == record.line_number
                    )
                ).first()
                
                if existing:
                    skipped_count += 1
                    continue
                
                # データベースに追加
                db.session.add(record)
                existing_records.add(duplicate_key)
                imported_count += 1
                
                # バッチコミット
                if imported_count % batch_size == 0:
                    db.session.commit()
                    print(f"💾 バッチコミット完了: {imported_count} 件")
                    
            except Exception as e:
                error_count += 1
                error_msg = f'行 {index + 2}: {str(e)}'
                errors.append(error_msg)
                print(f"❌ {error_msg}")
                continue
        
        # 最終コミット
        db.session.commit()
        
        result = {
            'message': 'CSVインポートが完了しました',
            'file_path': file_path,
            'encoding': successful_encoding,
            'batch_id': batch_id,
            'total_rows': total_rows,
            'imported_count': imported_count,
            'skipped_count': skipped_count,
            'error_count': error_count,
            'errors': errors
        }
        
        print(f"""
🎉 インポート完了！
📁 ファイル: {file_path}
📊 総行数: {total_rows}
✅ インポート成功: {imported_count} 件
⏭️  スキップ: {skipped_count} 件
❌ エラー: {error_count} 件
🆔 バッチID: {batch_id}
        """)
        
        if errors:
            print("❌ エラー詳細:")
            for error in errors[:10]:  # 最初の10件のエラーを表示
                print(f"   {error}")
            if len(errors) > 10:
                print(f"   ... 他 {len(errors) - 10} 件")
        
        return result
        
    except Exception as e:
        db.session.rollback()
        print(f"💥 致命的エラー: {str(e)}")
        raise e

def import_kitaseki_directory(directory_path, file_pattern="*.csv"):
    """
    指定ディレクトリ内のCSVファイルを一括インポート
    
    Args:
        directory_path (str): ディレクトリパス
        file_pattern (str): ファイルパターン（デフォルト: *.csv）
        
    Returns:
        list: 各ファイルのインポート結果
    """
    
    import glob
    
    if not os.path.exists(directory_path):
        raise FileNotFoundError(f'ディレクトリが見つかりません: {directory_path}')
    
    # CSV ファイルを検索
    search_pattern = os.path.join(directory_path, file_pattern)
    csv_files = glob.glob(search_pattern)
    
    if not csv_files:
        print(f"📂 CSVファイルが見つかりません: {search_pattern}")
        return []
    
    print(f"📂 {len(csv_files)} 個のCSVファイルを発見しました")
    
    results = []
    
    for csv_file in csv_files:
        print(f"\n🔄 処理開始: {os.path.basename(csv_file)}")
        try:
            result = import_kitaseki_csv_from_file(csv_file)
            results.append(result)
        except Exception as e:
            error_result = {
                'file_path': csv_file,
                'error': str(e),
                'imported_count': 0,
                'error_count': 1
            }
            results.append(error_result)
            print(f"💥 ファイル処理エラー: {csv_file} - {str(e)}")
    
    # 総計表示
    total_imported = sum(r.get('imported_count', 0) for r in results)
    total_errors = sum(r.get('error_count', 0) for r in results)
    
    print(f"""
🎊 一括インポート完了！
📁 処理ファイル数: {len(csv_files)}
✅ 総インポート件数: {total_imported} 件
❌ 総エラー件数: {total_errors} 件
    """)
    
    return results

# CLI用の実行部分
if __name__ == "__main__":
    """
    コマンドライン実行用
    使用例:
    python -m app.fuel.csv_import /path/to/file.csv
    python -m app.fuel.csv_import /path/to/directory/
    """
    
    if len(sys.argv) < 2:
        print("使用方法:")
        print("  python -m app.fuel.csv_import <CSVファイルまたはディレクトリパス>")
        print("")
        print("例:")
        print("  python -m app.fuel.csv_import data/kitaseki.csv")
        print("  python -m app.fuel.csv_import data/csv_files/")
        sys.exit(1)
    
    target_path = sys.argv[1]
    
    # Flask アプリケーションコンテキストが必要
    from app import create_app
    app = create_app()
    
    with app.app_context():
        try:
            if os.path.isfile(target_path):
                # 単一ファイルのインポート
                import_kitaseki_csv_from_file(target_path)
            elif os.path.isdir(target_path):
                # ディレクトリ内のファイル一括インポート
                import_kitaseki_directory(target_path)
            else:
                print(f"❌ ファイルまたはディレクトリが見つかりません: {target_path}")
                sys.exit(1)
                
        except KeyboardInterrupt:
            print("\n⏹️  インポートが中断されました")
            sys.exit(1)
        except Exception as e:
            print(f"💥 エラーが発生しました: {str(e)}")
            sys.exit(1)