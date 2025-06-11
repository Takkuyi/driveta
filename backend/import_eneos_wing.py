# backend/import_eneos_wing.py
"""
エネオスウィングCSVファイルの簡易インポートスクリプト

使用方法:
python import_eneos_wing.py "20250531.csv"
"""

import sys
import os
import pandas as pd
from datetime import datetime
from sqlalchemy.exc import SQLAlchemyError

from app import create_app
from app.extensions import db
from app.fuel.models import EneosWingRecord
from app.fuel.encoding_utils import try_multiple_encodings, preview_file_content

def import_eneos_wing_csv_command(csv_file_path):
    """
    コマンドライン用のエネオスウィングCSVインポート関数
    
    使用例:
    python import_eneos_wing.py /path/to/eneos_wing_data.csv
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
                
                # EneosWingRecordインスタンスを作成
                record = EneosWingRecord.from_csv_row(row.to_dict())
                
                # 基本的なバリデーション
                if not record.fuel_date:
                    skipped_count += 1
                    continue
                
                # 重複チェック
                existing = EneosWingRecord.query.filter_by(
                    fuel_date=record.fuel_date,
                    vehicle_number=record.vehicle_number,
                    receipt_number=record.receipt_number,
                    station_code=record.station_code
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

def validate_eneos_wing_csv_format(csv_file_path):
    """
    エネオスウィングCSVファイルの形式をバリデーション
    """
    try:
        # エンコーディング自動検出で読み込み
        df, encoding = try_multiple_encodings(csv_file_path)
        df = df.head(1)  # 最初の1行のみ
        
        required_columns = [
            '実車番・届先', '給油ＳＳコード', '給油ＳＳ名称', '給油日付', '給油時刻',
            'レシート番号', '商品分類', '商品コード', '荷姿コード', '商品名称',
            '数量', '換算後数量', '単価（軽油税込）', '単価（軽油税抜）',
            '金額（軽油税込）', '金額（軽油税抜）', '消費税', '合計金額', '軽油税'
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

def show_eneos_wing_csv_preview(csv_file_path, num_rows=3):
    """
    エネオスウィングCSVファイルのプレビュー表示
    """
    try:
        # エンコーディング自動検出で読み込み
        df, encoding = try_multiple_encodings(csv_file_path)
        df = df.head(num_rows)
        
        print(f"\n📋 CSVプレビュー（最初の{num_rows}行）:")
        print(f"🔤 エンコーディング: {encoding}")
        print("-" * 80)
        
        # 重要なカラムのみ表示
        preview_columns = ['給油日付', '実車番・届先', '給油ＳＳ名称', '商品名称', '数量', '単価（軽油税込）', '合計金額']
        
        for col in preview_columns:
            if col in df.columns:
                print(f"{col}: {df[col].tolist()}")
        
        print("-" * 80)
        
    except Exception as e:
        print(f"❌ プレビュー表示エラー: {str(e)}")

def main():
    print("🚀 エネオスウィング給油データ CSVインポートツール")
    print("=" * 60)
    
    # 引数チェック
    if len(sys.argv) != 2:
        print("❌ 使用法: python import_eneos_wing.py <CSVファイルパス>")
        print("\n例:")
        print('   python import_eneos_wing.py "20250531.csv"')
        sys.exit(1)
    
    csv_file_path = sys.argv[1]
    
    # ファイル存在チェック
    if not os.path.exists(csv_file_path):
        print(f"❌ ファイルが見つかりません: {csv_file_path}")
        print(f"   現在のディレクトリ: {os.getcwd()}")
        print(f"   ファイル一覧:")
        for file in os.listdir('.'):
            if file.endswith('.csv'):
                print(f"     - {file}")
        sys.exit(1)
    
    print(f"📁 ファイル: {csv_file_path}")
    print(f"📂 現在のディレクトリ: {os.getcwd()}")
    
    # アプリケーションコンテキストを作成
    try:
        app = create_app()
        print("✅ Flaskアプリケーション初期化完了")
    except Exception as e:
        print(f"❌ Flaskアプリケーション初期化エラー: {e}")
        sys.exit(1)
    
    with app.app_context():
        try:
            # CSVファイルの検証
            print("\n🔍 CSVファイル検証中...")
            if not validate_eneos_wing_csv_format(csv_file_path):
                print("❌ CSVファイルの形式が正しくありません")
                sys.exit(1)
            
            # プレビュー表示
            print("\n👀 データプレビュー:")
            show_eneos_wing_csv_preview(csv_file_path, 3)
            
            # ユーザー確認
            print("\n❓ インポートを実行しますか？")
            print("   y: 実行する")
            print("   n: キャンセル")
            
            while True:
                response = input("選択 [y/n]: ").lower().strip()
                if response in ['y', 'yes']:
                    break
                elif response in ['n', 'no']:
                    print("❌ インポートがキャンセルされました")
                    sys.exit(0)
                else:
                    print("❌ 'y' または 'n' を入力してください")
            
            # インポート実行
            print("\n🔄 インポート実行中...")
            success = import_eneos_wing_csv_command(csv_file_path)
            
            if success:
                print("\n🎉 インポートが正常に完了しました！")
                print("\n📊 次のステップ:")
                print("   - API確認: curl http://127.0.0.1:5000/api/fuel/eneos-wing/summary")
                print("   - データ確認: curl http://127.0.0.1:5000/api/fuel/eneos-wing/")
                sys.exit(0)
            else:
                print("\n💥 インポートが失敗しました")
                sys.exit(1)
                
        except KeyboardInterrupt:
            print("\n⏹️  ユーザーによって中断されました")
            sys.exit(1)
        except Exception as e:
            print(f"\n❌ 予期せぬエラーが発生しました: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)

if __name__ == "__main__":
    main()