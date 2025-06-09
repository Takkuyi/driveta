# backend/update_vehicle_nicknames.py

from app import create_app
from app.extensions import db
from app.vehicle.models import Vehicles

def update_all_vehicle_nicknames():
    """全車両の呼称を自動生成・更新"""
    
    app = create_app()
    
    with app.app_context():
        print("🚗 車両呼称の一括更新を開始します...")
        
        vehicles = Vehicles.query.all()
        print(f"📋 対象車両数: {len(vehicles)}台")
        
        updated_count = 0
        
        for vehicle in vehicles:
            old_nickname = vehicle.呼称
            plate = vehicle.自動車登録番号および車両番号
            
            print(f"\n🚚 車両ID: {vehicle.id}")
            print(f"  📄 ナンバープレート: {plate}")
            print(f"  🏷️  現在の呼称: {old_nickname}")
            
            # 呼称を自動生成・更新
            new_nickname = vehicle.update_nickname()
            
            if new_nickname:
                print(f"  ✅ 新しい呼称: {new_nickname}")
                if new_nickname != old_nickname:
                    updated_count += 1
                    print(f"  🔄 更新しました")
                else:
                    print(f"  ⏭️  変更なし")
            else:
                print(f"  ⚠️  呼称を生成できませんでした")
        
        try:
            db.session.commit()
            print(f"\n🎉 車両呼称の更新が完了しました！")
            print(f"📊 更新された車両数: {updated_count}台")
            
            # 結果の確認
            print(f"\n📋 更新後の車両呼称一覧:")
            for vehicle in Vehicles.query.all():
                display_name = vehicle.display_name
                plate = vehicle.自動車登録番号および車両番号 or "未登録"
                print(f"  ID:{vehicle.id} | 呼称:{display_name} | プレート:{plate}")
                
        except Exception as e:
            db.session.rollback()
            print(f"❌ エラーが発生しました: {e}")

if __name__ == "__main__":
    update_all_vehicle_nicknames()