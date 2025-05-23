from app.extensions import db  
from typing import Optional
from sqlalchemy import BigInteger, DateTime, Identity, Integer, PrimaryKeyConstraint, SmallInteger, String, text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
import datetime

class Vehicles(db.Model):
    __tablename__ = 'vehicles'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='vehicles_pkey1'),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(start=1, increment=1, minvalue=1, maxvalue=9223372036854775807, cycle=False, cache=1), primary_key=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), server_default=text('now()'))
    バージョン情報_二次元コード２_: Mapped[Optional[int]] = mapped_column('バージョン情報（二次元コード２）', SmallInteger)
    自動車登録番号および車両番号: Mapped[Optional[str]] = mapped_column(String)
    ナンバープレート区分: Mapped[Optional[int]] = mapped_column(SmallInteger)
    車台番号: Mapped[Optional[str]] = mapped_column(String)
    原動機型式: Mapped[Optional[str]] = mapped_column(String)
    帳票種別: Mapped[Optional[int]] = mapped_column(SmallInteger)
    バージョン情報_二次元コード３_: Mapped[Optional[int]] = mapped_column('バージョン情報（二次元コード３）', SmallInteger)
    車台番号打刻位置: Mapped[Optional[int]] = mapped_column(Integer)
    型式指定番号_種別区分番号: Mapped[Optional[int]] = mapped_column('型式指定番号・種別区分番号', BigInteger)
    有効期間の満了する日: Mapped[Optional[int]] = mapped_column(BigInteger)
    初年度登録年月: Mapped[Optional[str]] = mapped_column(String)
    型式: Mapped[Optional[str]] = mapped_column(String)
    軸重_前前_: Mapped[Optional[str]] = mapped_column('軸重（前前）', String)
    軸重_前後_: Mapped[Optional[str]] = mapped_column('軸重（前後）', String)
    軸重_後前_: Mapped[Optional[str]] = mapped_column('軸重（後前）', String)
    軸重_後後_: Mapped[Optional[str]] = mapped_column('軸重（後後）', String)
    騒音規制: Mapped[Optional[str]] = mapped_column(String)
    近接排気騒音規制値: Mapped[Optional[str]] = mapped_column(String)
    駆動方式: Mapped[Optional[str]] = mapped_column(String)
    オパシメータ測定車: Mapped[Optional[int]] = mapped_column(SmallInteger)
    NOx_PM測定モード: Mapped[Optional[str]] = mapped_column('NOx・PM測定モード', String)
    NOx値: Mapped[Optional[int]] = mapped_column(Integer)
    PM値: Mapped[Optional[int]] = mapped_column(Integer)
    保安基準適用年月日: Mapped[Optional[int]] = mapped_column(BigInteger)
    燃料の種類コード: Mapped[Optional[int]] = mapped_column(SmallInteger)
    ステータス: Mapped[Optional[str]] = mapped_column(String)
    車名:Mapped[Optional[str]] = mapped_column(String)