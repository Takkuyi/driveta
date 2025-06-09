# backend/migrations/versions/add_vehicle_nickname.py
"""Add vehicle nickname column

Revision ID: add_vehicle_nickname
Revises: 3c79db6d4824
Create Date: 2025-06-06 XX:XX:XX.XXXXXX

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_vehicle_nickname'
down_revision = '3c79db6d4824'
branch_labels = None
depends_on = None

def upgrade():
    # 呼称カラムを追加
    with op.batch_alter_table('vehicles', schema=None) as batch_op:
        batch_op.add_column(sa.Column('呼称', sa.String(length=10), nullable=True, comment='車両呼称（ナンバー下4桁）'))

def downgrade():
    # 呼称カラムを削除
    with op.batch_alter_table('vehicles', schema=None) as batch_op:
        batch_op.drop_column('呼称')