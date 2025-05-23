# app/employee/models.py

from datetime import datetime
from app.extensions import db

class Employee(db.Model):
    """従業員テーブル"""
    __tablename__ = 'employees'

    id = db.Column(db.Integer, primary_key=True)
    employee_code = db.Column(db.String(20), nullable=False, unique=True, comment='従業員コード')
    last_name = db.Column(db.String(50), nullable=False, comment='姓')
    first_name = db.Column(db.String(50), nullable=False, comment='名')
    last_name_kana = db.Column(db.String(50), comment='姓（カナ）')
    first_name_kana = db.Column(db.String(50), comment='名（カナ）')
    birth_date = db.Column(db.Date, comment='生年月日')
    join_date = db.Column(db.Date, comment='入社日')
    department = db.Column(db.String(50), comment='部署')
    position = db.Column(db.String(50), comment='役職')
    email = db.Column(db.String(100), comment='メールアドレス')
    phone = db.Column(db.String(20), comment='電話番号')
    license_type = db.Column(db.String(50), comment='免許種別')
    license_number = db.Column(db.String(50), comment='免許番号')
    license_expiry_date = db.Column(db.Date, comment='免許有効期限')
    is_driver = db.Column(db.Boolean, default=False, comment='運転手フラグ')
    is_mechanic = db.Column(db.Boolean, default=False, comment='整備士フラグ')
    is_active = db.Column(db.Boolean, default=True, comment='在籍フラグ')
    notes = db.Column(db.Text, comment='備考')
    created_at = db.Column(db.DateTime, default=datetime.now, comment='作成日時')
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now, comment='更新日時')

    # リレーションシップ
    # maintenance_schedules = db.relationship('MaintenanceSchedule', backref='employee', foreign_keys='MaintenanceSchedule.technician_id')
    # driving_records = db.relationship('DrivingRecord', backref='driver', foreign_keys='DrivingRecord.driver_id')

    def __repr__(self):
        return f'<Employee {self.employee_code}: {self.last_name} {self.first_name}>'
    
    @property
    def full_name(self):
        return f'{self.last_name} {self.first_name}'
    
    @property
    def full_name_kana(self):
        if self.last_name_kana and self.first_name_kana:
            return f'{self.last_name_kana} {self.first_name_kana}'
        return None