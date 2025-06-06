# backend/app/maintenance/auto_generation.py

from datetime import datetime, timedelta
from app.extensions import db
from app.vehicle.models import Vehicles
from app.maintenance.models import MaintenanceType, MaintenanceStatus, MaintenanceSchedule

def generate_maintenance_schedules_for_all_vehicles():
    """全車両の点検予定を自動生成"""
    
    # 点検種類の取得
    inspection_3month = MaintenanceType.query.filter_by(name='3ヶ月点検').first()
    inspection_12month = MaintenanceType.query.filter_by(name='車検').first()
    
    # 状態の取得
    scheduled_status = MaintenanceStatus.query.filter_by(name='予定').first()
    
    if not inspection_3month or not inspection_12month or not scheduled_status:
        print("必要なマスタデータが不足しています")
        return
    
    vehicles = Vehicles.query.filter_by(ステータス='運行中').all()
    generated_count = 0
    
    for vehicle in vehicles:
        generated_count += generate_vehicle_maintenance_schedule(
            vehicle, inspection_3month, inspection_12month, scheduled_status
        )
    
    db.session.commit()
    print(f"合計 {generated_count} 件の点検予定を生成しました")
    return generated_count

def generate_vehicle_maintenance_schedule(vehicle, inspection_3month, inspection_12month, scheduled_status):
    """単一車両の点検予定を生成"""
    generated_count = 0
    
    # 車検有効期限から点検予定を算出
    if vehicle.有効期間の満了する日:
        expiry_date = parse_expiry_date(vehicle.有効期間の満了する日)
        if expiry_date:
            # 12ヶ月点検（車検）の予定を生成
            generated_count += generate_12month_inspection_schedule(
                vehicle, inspection_12month, scheduled_status, expiry_date
            )
            
            # 3ヶ月点検の予定を生成
            generated_count += generate_3month_inspection_schedule(
                vehicle, inspection_3month, scheduled_status, expiry_date
            )
    
    return generated_count

def parse_expiry_date(expiry_date_value):
    """有効期限の数値を日付に変換"""
    try:
        if isinstance(expiry_date_value, int):
            date_str = str(expiry_date_value)
        else:
            date_str = str(int(expiry_date_value))
        
        if len(date_str) == 8:
            year = int(date_str[:4])
            month = int(date_str[4:6])
            day = int(date_str[6:8])
            return datetime(year, month, day).date()
    except (ValueError, TypeError):
        pass
    
    return None

def generate_12month_inspection_schedule(vehicle, inspection_type, status, base_expiry_date):
    """12ヶ月点検（車検）の予定を生成"""
    generated_count = 0
    
    # 今日から2年先までの車検予定を生成
    current_expiry = base_expiry_date
    today = datetime.now().date()
    end_date = today + timedelta(days=730)  # 2年先まで
    
    while current_expiry <= end_date:
        # 既に同じ日付の予定があるかチェック
        existing = MaintenanceSchedule.query.filter_by(
            vehicle_id=vehicle.id,
            maintenance_type_id=inspection_type.id,
            scheduled_date=current_expiry
        ).first()
        
        if not existing:
            # 新しい点検予定を作成
            new_schedule = MaintenanceSchedule(
                vehicle_id=vehicle.id,
                maintenance_type_id=inspection_type.id,
                scheduled_date=current_expiry,
                status_id=status.id,
                notes=f'車検有効期限({current_expiry.strftime("%Y年%m月%d日")})から自動生成'
            )
            db.session.add(new_schedule)
            generated_count += 1
            print(f"車検予定生成: {vehicle.自動車登録番号および車両番号} - {current_expiry}")
        
        # 次の車検は2年後
        current_expiry = datetime(current_expiry.year + 2, current_expiry.month, current_expiry.day).date()
    
    return generated_count

def generate_3month_inspection_schedule(vehicle, inspection_type, status, base_expiry_date):
    """3ヶ月点検の予定を生成"""
    generated_count = 0
    
    # 車検有効期限から逆算して3ヶ月ごとの点検日を計算
    today = datetime.now().date()
    start_date = today - timedelta(days=365)  # 1年前から
    end_date = today + timedelta(days=365)    # 1年後まで
    
    # 車検有効期限を基準に3ヶ月前の日付を算出
    base_3month_date = base_expiry_date - timedelta(days=90)  # 約3ヶ月前
    
    # 3ヶ月間隔で点検日を生成
    current_date = base_3month_date
    
    # 過去分も含めて生成（開始日まで遡る）
    while current_date > start_date:
        current_date = current_date - timedelta(days=90)
    
    # 指定期間内の3ヶ月点検を生成
    while current_date <= end_date:
        if start_date <= current_date <= end_date:
            # 既に同じ日付の予定があるかチェック
            existing = MaintenanceSchedule.query.filter_by(
                vehicle_id=vehicle.id,
                maintenance_type_id=inspection_type.id,
                scheduled_date=current_date
            ).first()
            
            if not existing:
                # 過去の日付は完了扱い、未来の日付は予定扱い
                if current_date < today:
                    # 完了状態を取得
                    completed_status = MaintenanceStatus.query.filter_by(name='完了').first()
                    schedule_status = completed_status if completed_status else status
                    completion_date = current_date
                else:
                    schedule_status = status
                    completion_date = None
                
                new_schedule = MaintenanceSchedule(
                    vehicle_id=vehicle.id,
                    maintenance_type_id=inspection_type.id,
                    scheduled_date=current_date,
                    completion_date=completion_date,
                    status_id=schedule_status.id,
                    notes=f'車検有効期限から3ヶ月間隔で自動生成'
                )
                db.session.add(new_schedule)
                generated_count += 1
                print(f"3ヶ月点検予定生成: {vehicle.自動車登録番号および車両番号} - {current_date}")
        
        # 次の3ヶ月後
        current_date = current_date + timedelta(days=90)
    
    return generated_count

def initialize_maintenance_master_data():
    """整備マスタデータの初期化"""
    
    # 点検種類の初期データ
    maintenance_types = [
        {'name': '車検', 'description': '法定12ヶ月点検（車検）', 'cycle_months': 12},
        {'name': '3ヶ月点検', 'description': '定期3ヶ月点検', 'cycle_months': 3},
        {'name': 'オイル交換', 'description': 'エンジンオイル交換', 'cycle_months': 3},
        {'name': 'タイヤ交換', 'description': 'タイヤ交換または位置交換', 'cycle_months': 6},
        {'name': 'ブレーキパッド交換', 'description': 'ブレーキパッドの点検と交換', 'cycle_months': 12},
    ]

    # 整備状態の初期データ
    maintenance_statuses = [
        {'name': '予定', 'description': '点検予定', 'color_code': '#007bff'},
        {'name': '完了', 'description': '点検完了', 'color_code': '#28a745'},
        {'name': '未実施', 'description': '期限切れ未実施', 'color_code': '#dc3545'},
        {'name': '延期', 'description': '点検延期', 'color_code': '#ffc107'},
        {'name': 'キャンセル', 'description': '点検キャンセル', 'color_code': '#6c757d'},
    ]

    # データベースに存在しない場合のみ登録
    for mt in maintenance_types:
        if not MaintenanceType.query.filter_by(name=mt['name']).first():
            db.session.add(MaintenanceType(**mt))

    for ms in maintenance_statuses:
        if not MaintenanceStatus.query.filter_by(name=ms['name']).first():
            db.session.add(MaintenanceStatus(**ms))

    db.session.commit()
    print("整備マスタデータを初期化しました")