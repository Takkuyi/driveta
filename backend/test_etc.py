# backend/test_etc_api.py
import requests
import json
from datetime import datetime, date

# APIベースURL
BASE_URL = "http://127.0.0.1:5000/api/etc"

def test_etc_usage_list():
    """ETC利用データ一覧取得のテスト"""
    print("=== ETC利用データ一覧取得テスト ===")
    
    response = requests.get(f"{BASE_URL}/usage")
    print(f"ステータスコード: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"取得件数: {len(data.get('data', []))}")
        print(f"ページネーション: {data.get('pagination')}")
        
        if data.get('data'):
            print("最初のレコード:")
            print(json.dumps(data['data'][0], indent=2, ensure_ascii=False))
    else:
        print(f"エラー: {response.text}")

def test_etc_statistics():
    """ETC統計情報取得のテスト"""
    print("\n=== ETC統計情報取得テスト ===")
    
    response = requests.get(f"{BASE_URL}/statistics")
    print(f"ステータスコード: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print("統計情報:")
        print(json.dumps(data, indent=2, ensure_ascii=False))
    else:
        print(f"エラー: {response.text}")

def test_vehicle_summary():
    """車両別サマリー取得のテスト"""
    print("\n=== 車両別サマリー取得テスト ===")
    
    response = requests.get(f"{BASE_URL}/vehicle-summary")
    print(f"ステータスコード: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"車両数: {len(data)}")
        
        if data:
            print("車両別利用状況（上位3件）:")
            for vehicle in data[:3]:
                print(json.dumps(vehicle, indent=2, ensure_ascii=False))
    else:
        print(f"エラー: {response.text}")

def test_csv_upload():
    """CSVアップロードのテスト"""
    print("\n=== CSVアップロードテスト ===")
    
    # テスト用CSVデータ
    csv_data = """利用年月日（自）,時分（自）,利用年月日（至）,時分（至）,利用ＩＣ（自）,利用ＩＣ（至）,割引前料金,ＥＴＣ割引額,通行料金,車両番号,ＥＴＣカード番号,備考
2025-01-15,09:30,2025-01-15,10:45,高崎IC,前橋IC,800,80,720,TRK-001,1234567890123456,定期配送
2025-01-15,14:20,2025-01-15,15:10,前橋IC,伊勢崎IC,600,60,540,TRK-001,1234567890123456,
2025-01-16,08:15,2025-01-16,09:30,高崎IC,太田桐生IC,1200,120,1080,TRK-002,2345678901234567,急配
"""
    
    # CSVファイルとしてアップロード
    files = {'file': ('test_etc.csv', csv_data, 'text/csv')}
    
    response = requests.post(f"{BASE_URL}/upload", files=files)
    print(f"ステータスコード: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print("アップロード結果:")
        print(json.dumps(data, indent=2, ensure_ascii=False))
    else:
        print(f"エラー: {response.text}")

if __name__ == "__main__":
    print("ETC API テストを開始します...\n")
    
    try:
        # 基本的なAPIテスト
        test_etc_usage_list()
        test_etc_statistics()
        test_vehicle_summary()
        
        # CSVアップロードテスト
        test_csv_upload()
        
        # アップロード後の確認
        print("\n=== アップロード後の確認 ===")
        test_etc_usage_list()
        test_etc_statistics()
        
    except requests.exceptions.ConnectionError:
        print("❌ Flask サーバーに接続できません。")
        print("以下のコマンドでサーバーを起動してください:")
        print("cd backend && python run.py")
    except Exception as e:
        print(f"❌ テスト中にエラーが発生しました: {e}")