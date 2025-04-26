# app/etc/schema.py

from marshmallow import Schema, fields

class ETCUsageSchema(Schema):
    id = fields.Int()
    start_date = fields.Date()
    start_time = fields.Str()
    end_date = fields.Date()
    end_time = fields.Str()
    departure_ic = fields.Str()
    arrival_ic = fields.Str()
    original_fee = fields.Int()
    discount = fields.Int()
    final_fee = fields.Int()
    vehicle_number = fields.Str()
    etc_card_number = fields.Str()
    notes = fields.Str(allow_none=True)
