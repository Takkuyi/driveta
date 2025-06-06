# backend/app/driving_log/models.py

from datetime import datetime, time, timedelta
from app.extensions import db
from sqlalchemy import Numeric

class DeliveryDestination(db.Model):
    """配送先マスタテーブル"""
    __tablename__ = 'delivery_destinations'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, comment='配送先名')
    address = db.Column(db.String(200), comment='住所')
    phone = db.Column(db.String(20), comment='電話番号')
    contact_person = db.Column(db.String(50), comment='担当者名')
    notes = db.Column(db.Text, comment='備考')
    is_active = db.Column(db.Boolean, default=True, comment='有効フラグ')
    created_at = db.Column(db.DateTime, default=datetime.now, comment='作成日時')
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now, comment='更新日時')

    # リレーションシップ
    driving_logs = db.relationship('DrivingLog', back_populates='destination')

    def __repr__(self):
        return f'<DeliveryDestination {self.name}>'

class DrivingLog(db.Model):
    """運転日報テーブル"""
    __tablename__ = 'driving_logs'

    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False, comment='勤務日')
    driver_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False, comment='ドライバーID')
    vehicle_id = db.Column(db.Integer, db.ForeignKey('vehicles.id'), nullable=False, comment='使用車両ID')
    
    # 勤務時間
    start_time = db.Column(db.Time, nullable=False, comment='勤務開始時刻')
    end_time = db.Column(db.Time, nullable=False, comment='勤務終了時刻')
    
    # 走行距離
    start_mileage = db.Column(db.Integer, nullable=False, comment='開始時走行距離')
    end_mileage = db.Column(db.Integer, nullable=False, comment='終了時走行距離')
    
    # 配送先
    destination_id = db.Column(db.Integer, db.ForeignKey('delivery_destinations.id'), comment='配送先ID')
    destination_name = db.Column(db.String(100), comment='配送先名（手入力）')  # マスタにない場合の手入力用
    
    # 見習いフラグ
    is_trainee = db.Column(db.Boolean, default=False, comment='見習いフラグ')
    
    # その他
    notes = db.Column(db.Text, comment='備考')
    created_by = db.Column(db.Integer, db.ForeignKey('employees.id'), comment='登録者ID')
    created_at = db.Column(db.DateTime, default=datetime.now, comment='作成日時')
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now, comment='更新日時')

    # リレーションシップ
    driver = db.relationship('Employee', foreign_keys=[driver_id], back_populates='driving_logs_as_driver')
    vehicle = db.relationship('Vehicles', back_populates='driving_logs')
    destination = db.relationship('DeliveryDestination', back_populates='driving_logs')
    creator = db.relationship('Employee', foreign_keys=[created_by])

    def __repr__(self):
        return f'<DrivingLog {self.date} - {self.driver.full_name if self.driver else "Unknown"}>'
    
    @property
    def daily_mileage(self):
        """1日の走行距離を計算"""
        if self.start_mileage and self.end_mileage:
            return self.end_mileage - self.start_mileage
        return 0
    
    @property
    def work_hours(self):
        """勤務時間を計算（時間単位）"""
        if self.start_time and self.end_time:
            start_datetime = datetime.combine(datetime.today(), self.start_time)
            end_datetime = datetime.combine(datetime.today(), self.end_time)
            
            # 日をまたぐ場合の対応
            if end_datetime < start_datetime:
                end_datetime += timedelta(days=1)
            
            duration = end_datetime - start_datetime
            return duration.total_seconds() / 3600  # 時間に変換
        return 0

class FuelingRecord(db.Model):
    """給油記録テーブル"""
    __tablename__ = 'fueling_records'

    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False, comment='給油日')
    vehicle_id = db.Column(db.Integer, db.ForeignKey('vehicles.id'), nullable=False, comment='車両ID')
    driver_id = db.Column(db.Integer, db.ForeignKey('employees.id'), comment='ドライバーID')
    
    # 給油情報
    gas_station_name = db.Column(db.String(100), comment='ガソリンスタンド名')
    fuel_type = db.Column(db.String(20), comment='燃料種別')  # 軽油、ガソリンなど
    fuel_amount = db.Column(Numeric(10, 2), comment='給油量（リットル）')
    unit_price = db.Column(Numeric(10, 2), comment='単価')
    total_amount = db.Column(Numeric(10, 2), comment='合計金額')
    mileage = db.Column(db.Integer, comment='給油時走行距離')
    
    # CSVインポート情報
    csv_source = db.Column(db.String(50), comment='CSVソース')  # どのガソリンスタンドのCSV形式か
    imported_at = db.Column(db.DateTime, comment='インポート日時')
    
    # その他
    notes = db.Column(db.Text, comment='備考')
    created_by = db.Column(db.Integer, db.ForeignKey('employees.id'), comment='登録者ID')
    created_at = db.Column(db.DateTime, default=datetime.now, comment='作成日時')
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now, comment='更新日時')

    # リレーションシップ
    vehicle = db.relationship('Vehicles', back_populates='fueling_records')
    driver = db.relationship('Employee', foreign_keys=[driver_id])
    creator = db.relationship('Employee', foreign_keys=[created_by])

    def __repr__(self):
        return f'<FuelingRecord {self.date} - {self.vehicle.自動車登録番号および車両番号 if self.vehicle else "Unknown"}>'

class CarWashRecord(db.Model):
    """洗車記録テーブル"""
    __tablename__ = 'car_wash_records'

    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False, comment='洗車日')
    vehicle_id = db.Column(db.Integer, db.ForeignKey('vehicles.id'), nullable=False, comment='車両ID')
    driver_id = db.Column(db.Integer, db.ForeignKey('employees.id'), comment='ドライバーID')
    
    # 洗車情報
    wash_type = db.Column(db.String(50), comment='洗車種別')  # 手洗い、機械洗車など
    facility_name = db.Column(db.String(100), comment='洗車施設名')
    cost = db.Column(Numeric(10, 2), comment='費用')
    mileage = db.Column(db.Integer, comment='洗車時走行距離')
    
    # CSVインポート情報
    csv_source = db.Column(db.String(50), comment='CSVソース')
    imported_at = db.Column(db.DateTime, comment='インポート日時')
    
    # その他
    notes = db.Column(db.Text, comment='備考')
    created_by = db.Column(db.Integer, db.ForeignKey('employees.id'), comment='登録者ID')
    created_at = db.Column(db.DateTime, default=datetime.now, comment='作成日時')
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now, comment='更新日時')

    # リレーションシップ
    vehicle = db.relationship('Vehicles', back_populates='car_wash_records')
    driver = db.relationship('Employee', foreign_keys=[driver_id])
    creator = db.relationship('Employee', foreign_keys=[created_by])

    def __repr__(self):
        return f'<CarWashRecord {self.date} - {self.vehicle.自動車登録番号および車両番号 if self.vehicle else "Unknown"}>'