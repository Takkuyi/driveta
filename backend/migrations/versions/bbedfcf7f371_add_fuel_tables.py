""" add fuel tables

Revision ID: bbedfcf7f371
Revises: add_vehicle_nickname
Create Date: 2025-06-10 09:46:50.993266

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'bbedfcf7f371'
down_revision = 'add_vehicle_nickname'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('fuel_stations',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('station_code', sa.String(length=50), nullable=True, comment='スタンドコード'),
    sa.Column('station_name', sa.String(length=200), nullable=False, comment='スタンド名'),
    sa.Column('company_name', sa.String(length=100), nullable=True, comment='運営会社名'),
    sa.Column('company_code', sa.String(length=20), nullable=True, comment='会社コード'),
    sa.Column('address', sa.String(length=500), nullable=True, comment='住所'),
    sa.Column('prefecture', sa.String(length=20), nullable=True, comment='都道府県'),
    sa.Column('city', sa.String(length=50), nullable=True, comment='市区町村'),
    sa.Column('phone', sa.String(length=20), nullable=True, comment='電話番号'),
    sa.Column('is_active', sa.Boolean(), nullable=True, comment='有効フラグ'),
    sa.Column('created_at', sa.DateTime(), nullable=True, comment='作成日時'),
    sa.Column('updated_at', sa.DateTime(), nullable=True, comment='更新日時'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('station_code')
    )
    op.create_table('import_batches',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('batch_id', sa.String(length=50), nullable=False, comment='バッチID'),
    sa.Column('file_name', sa.String(length=255), nullable=False, comment='ファイル名'),
    sa.Column('file_size', sa.Integer(), nullable=True, comment='ファイルサイズ（バイト）'),
    sa.Column('csv_format_type', sa.String(length=50), nullable=False, comment='CSVフォーマット種別'),
    sa.Column('company_name', sa.String(length=50), nullable=True, comment='ガソリンスタンド会社名'),
    sa.Column('total_rows', sa.Integer(), nullable=True, comment='総行数'),
    sa.Column('success_rows', sa.Integer(), nullable=True, comment='成功行数'),
    sa.Column('error_rows', sa.Integer(), nullable=True, comment='エラー行数'),
    sa.Column('duplicate_rows', sa.Integer(), nullable=True, comment='重複行数'),
    sa.Column('skipped_rows', sa.Integer(), nullable=True, comment='スキップ行数'),
    sa.Column('status', sa.String(length=20), nullable=True, comment='状態'),
    sa.Column('error_message', sa.Text(), nullable=True, comment='エラーメッセージ'),
    sa.Column('import_started_at', sa.DateTime(), nullable=True, comment='取り込み開始日時'),
    sa.Column('import_completed_at', sa.DateTime(), nullable=True, comment='取り込み完了日時'),
    sa.Column('created_by', sa.String(length=50), nullable=True, comment='実行者'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('batch_id')
    )
    op.create_table('service_types',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('service_code', sa.String(length=20), nullable=False, comment='サービスコード'),
    sa.Column('service_name', sa.String(length=100), nullable=False, comment='サービス名'),
    sa.Column('category', sa.String(length=50), nullable=False, comment='カテゴリ'),
    sa.Column('unit', sa.String(length=20), nullable=True, comment='単位'),
    sa.Column('is_fuel', sa.Boolean(), nullable=True, comment='燃料フラグ'),
    sa.Column('is_active', sa.Boolean(), nullable=True, comment='有効フラグ'),
    sa.Column('created_at', sa.DateTime(), nullable=True, comment='作成日時'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('service_code')
    )
    op.create_table('import_errors',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('batch_id', sa.String(length=50), nullable=False, comment='バッチID'),
    sa.Column('csv_row_number', sa.Integer(), nullable=False, comment='CSVの行番号'),
    sa.Column('error_type', sa.String(length=50), nullable=True, comment='エラー種別'),
    sa.Column('error_message', sa.Text(), nullable=True, comment='エラーメッセージ'),
    sa.Column('raw_csv_data', sa.Text(), nullable=True, comment='エラーが発生した生CSVデータ'),
    sa.Column('created_at', sa.DateTime(), nullable=True, comment='作成日時'),
    sa.ForeignKeyConstraint(['batch_id'], ['import_batches.batch_id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('vehicle_cards',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('vehicle_id', sa.Integer(), nullable=False, comment='車両ID'),
    sa.Column('card_number', sa.String(length=50), nullable=False, comment='カード番号'),
    sa.Column('card_type', sa.String(length=20), nullable=True, comment='カード種別'),
    sa.Column('company_name', sa.String(length=50), nullable=True, comment='カード会社名'),
    sa.Column('issue_date', sa.Date(), nullable=True, comment='発行日'),
    sa.Column('expiry_date', sa.Date(), nullable=True, comment='有効期限'),
    sa.Column('is_active', sa.Boolean(), nullable=True, comment='有効フラグ'),
    sa.Column('notes', sa.Text(), nullable=True, comment='備考'),
    sa.Column('created_at', sa.DateTime(), nullable=True, comment='作成日時'),
    sa.ForeignKeyConstraint(['vehicle_id'], ['vehicles.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('service_records',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('vehicle_id', sa.Integer(), nullable=True, comment='車両ID'),
    sa.Column('vehicle_card_id', sa.Integer(), nullable=True, comment='車両カードID'),
    sa.Column('fuel_station_id', sa.Integer(), nullable=True, comment='スタンドID'),
    sa.Column('service_type_id', sa.Integer(), nullable=False, comment='サービス種別ID'),
    sa.Column('service_date', sa.Date(), nullable=False, comment='利用日'),
    sa.Column('service_time', sa.Time(), nullable=True, comment='利用時刻'),
    sa.Column('product_code', sa.String(length=50), nullable=True, comment='商品コード'),
    sa.Column('product_name', sa.String(length=200), nullable=True, comment='商品名'),
    sa.Column('quantity', sa.Numeric(precision=10, scale=3), nullable=True, comment='数量'),
    sa.Column('unit_price', sa.Numeric(precision=10, scale=2), nullable=True, comment='単価'),
    sa.Column('unit_price_before_tax', sa.Numeric(precision=10, scale=2), nullable=True, comment='税抜単価'),
    sa.Column('amount_before_tax', sa.Numeric(precision=10, scale=0), nullable=True, comment='税抜金額'),
    sa.Column('tax_amount', sa.Numeric(precision=10, scale=0), nullable=True, comment='消費税額'),
    sa.Column('total_amount', sa.Numeric(precision=10, scale=0), nullable=False, comment='合計金額'),
    sa.Column('odometer_reading', sa.Integer(), nullable=True, comment='オドメーター読み値（km）'),
    sa.Column('trip_distance', sa.Integer(), nullable=True, comment='前回給油からの距離（km）'),
    sa.Column('fuel_efficiency', sa.Numeric(precision=5, scale=2), nullable=True, comment='燃費（km/L）'),
    sa.Column('card_number_masked', sa.String(length=20), nullable=True, comment='カード番号（マスク済み）'),
    sa.Column('transaction_id', sa.String(length=100), nullable=True, comment='取引ID'),
    sa.Column('receipt_number', sa.String(length=50), nullable=True, comment='レシート番号'),
    sa.Column('import_file_name', sa.String(length=255), nullable=True, comment='取り込み元ファイル名'),
    sa.Column('import_batch_id', sa.String(length=50), nullable=True, comment='取り込みバッチID'),
    sa.Column('csv_format_type', sa.String(length=50), nullable=True, comment='CSVフォーマット種別'),
    sa.Column('csv_row_number', sa.Integer(), nullable=True, comment='CSVの行番号'),
    sa.Column('raw_data', sa.Text(), nullable=True, comment='生データ（JSON形式）'),
    sa.Column('notes', sa.Text(), nullable=True, comment='備考'),
    sa.Column('created_at', sa.DateTime(), nullable=True, comment='作成日時'),
    sa.Column('updated_at', sa.DateTime(), nullable=True, comment='更新日時'),
    sa.ForeignKeyConstraint(['fuel_station_id'], ['fuel_stations.id'], ),
    sa.ForeignKeyConstraint(['service_type_id'], ['service_types.id'], ),
    sa.ForeignKeyConstraint(['vehicle_card_id'], ['vehicle_cards.id'], ),
    sa.ForeignKeyConstraint(['vehicle_id'], ['vehicles.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    #with op.batch_alter_table('courses', schema=None) as batch_op:
    #    batch_op.alter_column('fld_コースID',
    #           existing_type=sa.SMALLINT(),
    #           server_default=None,
    #           existing_nullable=False,
    #           autoincrement=True)

    #with op.batch_alter_table('vehicles', schema=None) as batch_op:
     #   batch_op.alter_column('初年度登録年月',
      #         existing_type=sa.TEXT(),
       #        type_=sa.String(),
        #       existing_nullable=True)
        #batch_op.drop_column('呼称')

    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('vehicles', schema=None) as batch_op:
        batch_op.add_column(sa.Column('呼称', sa.VARCHAR(length=10), autoincrement=False, nullable=True, comment='車両呼称（ナンバー下4桁）'))
        batch_op.alter_column('初年度登録年月',
               existing_type=sa.String(),
               type_=sa.TEXT(),
               existing_nullable=True)

    with op.batch_alter_table('courses', schema=None) as batch_op:
        batch_op.alter_column('fld_コースID',
               existing_type=sa.SMALLINT(),
               server_default=sa.Identity(always=False, start=1, increment=1, minvalue=1, maxvalue=32767, cycle=False, cache=1),
               existing_nullable=False,
               autoincrement=True)

    op.drop_table('service_records')
    op.drop_table('vehicle_cards')
    op.drop_table('import_errors')
    op.drop_table('service_types')
    op.drop_table('import_batches')
    op.drop_table('fuel_stations')
    # ### end Alembic commands ###
