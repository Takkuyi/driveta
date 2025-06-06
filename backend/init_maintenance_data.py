# backend/init_maintenance_data.py

from app import create_app
from app.extensions import db
from app.maintenance.models import MaintenanceType, MaintenanceStatus
from app.maintenance.auto_generation import initialize_maintenance_master_data, generate_maintenance_schedules_for_all_vehicles

def main():
    """整備マスタデータの初期化と点検予定の自動生成"""
    app = create_app()
    
    with app.app_context():
        print("=== 整備管理システム初期化 ===")
        
        # マスタデータの初期化
        print("1. マスタデータの初期化...")
        initialize_maintenance_master_data()
        
        # 点検予定の自動生成
        print("2. 点検予定の自動生成...")
        try:
            count = generate_maintenance_schedules_for_all_vehicles()
            print(f"   → {count}件の点検予定を生成しました")
        except Exception as e:
            print(f"   → エラー: {e}")
        
        print("=== 初期化完了 ===")

if __name__ == '__main__':
    main()