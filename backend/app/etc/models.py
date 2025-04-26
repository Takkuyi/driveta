from app.extensions import db

class ETCUsage(db.Model):
    __tablename__ = "etc_usage"

    id = db.Column(db.Integer, primary_key=True)
    
    # 日付・時刻
    start_date = db.Column(db.Date)
    start_time = db.Column(db.String(5))
    end_date = db.Column(db.Date)
    end_time = db.Column(db.String(5))
    
    # 区間
    departure_ic = db.Column(db.String(100))
    arrival_ic = db.Column(db.String(100))
    
    # 料金
    original_fee = db.Column(db.Integer)     # 割引前料金
    discount = db.Column(db.Integer)         # ETC割引額
    final_fee = db.Column(db.Integer)        # 実際の支払額

    # 車両情報
    vehicle_number = db.Column(db.String(64))
    etc_card_number = db.Column(db.String(32))

    # 備考
    notes = db.Column(db.String(100))

    def __repr__(self):
        return f"<ETCUsage {self.start_date} {self.vehicle_number} {self.departure_ic}→{self.arrival_ic}>"
