# backend/app/fuel/csv_import.py

import os
import sys
import pandas as pd
from datetime import datetime
from sqlalchemy.exc import SQLAlchemyError

# アプリケーションコンテキストのインポート
from app import create_app
from app.extensions import db
from app.fuel.models import EnefleRecord
from app.fuel.encoding_utils import try_multiple_encodings, preview_file_content

def import_enefle_csv_command(csv_file_path):
    """
    コマンドライン用のエネフレCSVインポート関数
    
    使用例:
    python -m app.fuel.csv_import /path/to/enefle_data.csv
    """
    
    if not os.path.exists(csv_file_path):
        print(f"❌ ファイルが見つかりません: {csv_file_path}")
        return False
    
    print(f"📁 CSVファイルを読み込み中: {csv_file_path}")
    
    try:
        # ファイル内容のプレビュー
        preview_file_content(csv_file_path)
        
        # エンコーディング自動検出でCSVファイルを読み込み
        df, successful_encoding = try_multiple_encodings(csv_file_path)
        df = df.fillna('')  # NaNを空文字に変換
        
        print(f"📊 総レコード数: {len(df)}")
        print(f"📋 カラム数: {len(df.columns)}")
        print(f"🔤 使用エンコーディング: {successful_encoding}")
        
        # 統計情報
        imported_count = 0
        skipped_count = 0
        skipped_8010_count = 0  # 商品コード8010でスキップした件数
        error_count = 0
        errors = []
        
        # プログレス表示用
        total_rows = len(df)
        
        print("🔄 データインポート開始...")
        
        for index, row in df.iterrows():
            try:
                # プログレス表示（100件ごと）
                if (index + 1) % 100 == 0:
                    progress = ((index + 1) / total_rows) * 100
                    print(f"⏳ 進捗: {index + 1}/{total_rows} ({progress:.1f}%)")
                
                # EnefleRecordインスタンスを作成
                record = EnefleRecord.from_csv_row(row.to_dict())
                
                # 商品コード8010の場合はスキップ
                if record is None:
                    skipped_8010_count += 1
                    continue
                
                # 基本的なバリデーション
                if not record.transaction_date:
                    skipped_count += 1
                    continue
                
                # 重複チェック
                existing = EnefleRecord.query.filter_by(
                    transaction_date=record.transaction_date,
                    input_vehicle_number=record.input_vehicle_number,
                    slip_number=record.slip_number,
                    slip_branch_number=record.slip_branch_number
                ).first()
                
                if existing:
                    skipped_count += 1
                    continue
                
                # データベースに追加
                db.session.add(record)
                imported_count += 1
                
                # 100件ごとにコミット
                if imported_count % 100 == 0:
                    db.session.commit()
                    
            except Exception as e:
                error_count += 1
                error_msg = f'行 {index + 2}: {str(e)}'
                errors.append(error_msg)
                print(f"⚠️  {error_msg}")
                continue
        
        # 最終コミット
        db.session.commit()
        
        # 結果表示
        print("\n" + "="*50)
        print("📈 インポート結果:")
        print(f"✅ 正常にインポート: {imported_count}件")
        print(f"⏭️  スキップ（重複等）: {skipped_count}件")
        print(f"🚫 商品コード8010でスキップ: {skipped_8010_count}件")
        print(f"❌ エラー: {error_count}件")
        print(f"📊 総処理レコード数: {total_rows}件")
        
        if errors:
            print(f"\n🚨 エラー詳細（最初の5件）:")
            for error in errors[:5]:
                print(f"   {error}")
        
        print("="*50)
        return True
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ CSVインポート中に致命的エラーが発生しました: {str(e)}")
        return False

def validate_csv_format(csv_file_path):
    """
    CSVファイルの形式をバリデーション
    """
    try:
        # エンコーディング自動検出で読み込み
        df, encoding = try_multiple_encodings(csv_file_path)
        df = df.head(1)  # 最初の1行のみ
        
        required_columns = [
            'カード車番', '日付', '給油所名', '商品名', '数量', 
            '単価', '金額', '伝票番号', '入力車番', '給油時間',
            '税抜き単価', '税抜き金額', '軽油引取税', '消費税', '消費税率'
        ]
        
        missing_columns = []
        for col in required_columns:
            if col not in df.columns:
                missing_columns.append(col)
        
        if missing_columns:
            print(f"❌ 必須カラムが不足しています: {missing_columns}")
            print(f"📋 実際のカラム: {list(df.columns)}")
            return False
        
        print("✅ CSVフォーマットは正常です")
        print(f"🔤 検出エンコーディング: {encoding}")
        return True
        
    except Exception as e:
        print(f"❌ CSV検証エラー: {str(e)}")
        return False

def show_csv_preview(csv_file_path, num_rows=3):
    """
    CSVファイルのプレビュー表示
    """
    try:
        # エンコーディング自動検出で読み込み
        df, encoding = try_multiple_encodings(csv_file_path)
        df = df.head(num_rows)
        
        print(f"\n📋 CSVプレビュー（最初の{num_rows}行）:")
        print(f"🔤 エンコーディング: {encoding}")
        print("-" * 80)
        
        # 重要なカラムのみ表示
        preview_columns = ['日付', '給油所名', '商品名', '数量', '単価', '金額', '入力車番']
        
        for col in preview_columns:
            if col in df.columns:
                print(f"{col}: {df[col].tolist()}")
        
        print("-" * 80)
        
    except Exception as e:
        print(f"❌ プレビュー表示エラー: {str(e)}")

if __name__ == "__main__":
    """
    コマンドライン実行用
    
    使用例:
    cd backend
    python -m app.fuel.csv_import path/to/enefle_data.csv
    """
    
    if len(sys.argv) != 2:
        print("使用法: python -m app.fuel.csv_import <CSVファイルパス>")
        sys.exit(1)
    
    csv_file_path = sys.argv[1]
    
    # アプリケーションコンテキストを作成
    app = create_app()
    
    with app.app_context():
        print("🚀 エネフレ給油データ CSVインポートツール")
        print("=" * 50)
        
        # CSVファイルの検証
        if not validate_csv_format(csv_file_path):
            sys.exit(1)
        
        # プレビュー表示
        show_csv_preview(csv_file_path)
        
        # ユーザー確認
        response = input("\nインポートを実行しますか？ [y/N]: ")
        if response.lower() not in ['y', 'yes']:
            print("❌ インポートがキャンセルされました")
            sys.exit(0)
        
        # インポート実行
        success = import_enefle_csv_command(csv_file_path)
        
        if success:
            print("🎉 インポートが正常に完了しました！")
            sys.exit(0)
        else:
            print("💥 インポートが失敗しました")
            sys.exit(1)