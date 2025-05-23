# app/maintenance/models.py

from datetime import datetime
from app.extensions import db
from app.vehicle.models import Vehicles


class MaintenanceType(db.Model):
    """点検種類マスタテーブル"""
    __tablename__ = 'maintenance_types'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False, comment='点検種類名')  # 例: '車検', '3ヶ月点検', 'オイル交換'
    description = db.Column(db.Text, comment='説明')
    cycle_months = db.Column(db.Integer, comment='点検周期（月）')  # 例: 12, 3, 6
    is_active = db.Column(db.Boolean, default=True, comment='有効フラグ')
    created_at = db.Column(db.DateTime, default=datetime.now, comment='作成日時')
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now, comment='更新日時')

    def __repr__(self):
        return f'<MaintenanceType {self.name}>'


class MaintenanceStatus(db.Model):
    """整備状態マスタテーブル"""
    __tablename__ = 'maintenance_statuses'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False, comment='状態名')  # 例: '予定', '完了', '未実施'
    description = db.Column(db.Text, comment='説明')
    color_code = db.Column(db.String(7), comment='色コード（例：#FF0000）')
    created_at = db.Column(db.DateTime, default=datetime.now, comment='作成日時')
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now, comment='更新日時')

    def __repr__(self):
        return f'<MaintenanceStatus {self.name}>'


class MaintenanceSchedule(db.Model):
    """整備予定・実績テーブル"""
    __tablename__ = 'maintenance_schedules'

    id = db.Column(db.Integer, primary_key=True)
    vehicle_id = db.Column(db.Integer, db.ForeignKey('vehicles.id'), nullable=False, comment='車両ID')
    maintenance_type_id = db.Column(db.Integer, db.ForeignKey('maintenance_types.id'), nullable=False, comment='点検種類ID')
    scheduled_date = db.Column(db.Date, nullable=False, comment='予定日')
    completion_date = db.Column(db.Date, comment='完了日')
    status_id = db.Column(db.Integer, db.ForeignKey('maintenance_statuses.id'), nullable=False, comment='状態ID')
    technician = db.Column(db.String(100), comment='担当者')
    technician_id = db.Column(db.Integer, db.ForeignKey('employees.id'), comment='担当者ID')
    technician_employee = db.relationship('Employee', foreign_keys=[technician_id])
    location = db.Column(db.String(200), comment='実施場所')
    cost = db.Column(db.Numeric(10, 2), comment='費用')
    notes = db.Column(db.Text, comment='備考')
    created_at = db.Column(db.DateTime, default=datetime.now, comment='作成日時')
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now, comment='更新日時')

    # リレーションシップ
    vehicle = db.relationship('Vehicles', backref='maintenance_schedules')
    maintenance_type = db.relationship('MaintenanceType', backref='maintenance_schedules')
    status = db.relationship('MaintenanceStatus', backref='maintenance_schedules')

    def __repr__(self):
        return f'<MaintenanceSchedule {self.id} - {self.vehicle_id} - {self.scheduled_date}>'


class MaintenanceDetail(db.Model):
    """整備詳細テーブル"""
    __tablename__ = 'maintenance_details'

    id = db.Column(db.Integer, primary_key=True)
    maintenance_schedule_id = db.Column(db.Integer, db.ForeignKey('maintenance_schedules.id'), nullable=False, comment='整備予定ID')
    item_name = db.Column(db.String(100), nullable=False, comment='点検項目名')
    result = db.Column(db.String(100), comment='点検結果')  # 例: '正常', '要交換', '修理済み'
    is_ok = db.Column(db.Boolean, comment='合否フラグ')
    action_taken = db.Column(db.Text, comment='実施内容')
    parts_used = db.Column(db.Text, comment='使用部品')
    parts_cost = db.Column(db.Numeric(10, 2), comment='部品費用')
    notes = db.Column(db.Text, comment='備考')
    created_at = db.Column(db.DateTime, default=datetime.now, comment='作成日時')
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now, comment='更新日時')

    # リレーションシップ
    maintenance_schedule = db.relationship('MaintenanceSchedule', backref='details')

    def __repr__(self):
        return f'<MaintenanceDetail {self.id} - {self.item_name}>'


class MaintenanceFile(db.Model):
    """整備関連ファイルテーブル"""
    __tablename__ = 'maintenance_files'

    id = db.Column(db.Integer, primary_key=True)
    maintenance_schedule_id = db.Column(db.Integer, db.ForeignKey('maintenance_schedules.id'), nullable=False, comment='整備予定ID')
    file_name = db.Column(db.String(255), nullable=False, comment='ファイル名')
    file_path = db.Column(db.String(255), nullable=False, comment='ファイルパス')
    file_type = db.Column(db.String(50), comment='ファイルタイプ')  # 例: 'image/jpeg', 'application/pdf'
    file_size = db.Column(db.Integer, comment='ファイルサイズ（バイト）')
    description = db.Column(db.Text, comment='説明')
    uploaded_by = db.Column(db.String(100), comment='アップロード者')
    created_at = db.Column(db.DateTime, default=datetime.now, comment='作成日時')

    # リレーションシップ
    maintenance_schedule = db.relationship('MaintenanceSchedule', backref='files')

    def __repr__(self):
        return f'<MaintenanceFile {self.id} - {self.file_name}>'


# 初期データ登録用関数
def init_maintenance_data():
    """マスタデータの初期登録"""
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