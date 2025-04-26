from typing import List, Optional

from sqlalchemy import Column, DECIMAL, Date, DateTime, Enum, ForeignKeyConstraint, Index, String, TIMESTAMP, Table, Text, text
from sqlalchemy.dialects.mysql import BIT, INTEGER, MEDIUMTEXT, SMALLINT
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
import datetime
import decimal

# Flask用に修正（flask_sqlalchemyを使用）
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class CrateWeights(db.Model):
    __tablename__ = 'crate_weights'

    fld_クレート種別: Mapped[str] = mapped_column(String(255))
    id: Mapped[int] = mapped_column(INTEGER(11), primary_key=True)
    fld_重量: Mapped[Optional[int]] = mapped_column(SMALLINT(6))

    def to_dict(self):
        """JSONレスポンス用に辞書化"""
        return {
            "fld_クレート種別": self.fld_クレート種別,
            "id": self.id,
            "fld_重量": self.fld_重量,
        }    

class CourseGroups(db.Model):
    __tablename__ = 'course_groups'

    fld_グループID: Mapped[int] = mapped_column(INTEGER(11), primary_key=True)
    fld_コースID: Mapped[Optional[int]] = mapped_column(SMALLINT(6))
    fld_コースグループID: Mapped[Optional[int]] = mapped_column(INTEGER(11))
    fld_得意先コード: Mapped[Optional[int]] = mapped_column(INTEGER(11))
    fld_得意先名: Mapped[Optional[str]] = mapped_column(String(255))


    def to_dict(self):
        """JSONレスポンス用に辞書化"""
        return {
            "fld_グループID": self.fld_グループID,
            "fld_コースID": self.fld_コースID,
            "fld_コースグループID": self.fld_コースグループID,
            "fld_得意先コード": self.fld_得意先コード,
            "fld_得意先名": self.fld_得意先名
        }    
   
class Courses(db.Model):
    __tablename__ = 'courses'

    fld_コースID: Mapped[int] = mapped_column(SMALLINT(6), primary_key=True)
    fld_コース名: Mapped[Optional[str]] = mapped_column(String(255))
    fld_車格: Mapped[Optional[str]] = mapped_column(String(255))
    fld_積み方ID: Mapped[Optional[str]] = mapped_column(String(255))
    fld_KR便名: Mapped[Optional[str]] = mapped_column(String(255))
    fld_仕分日係数: Mapped[Optional[int]] = mapped_column(INTEGER(11))
    
    def to_dict(self):
        """JSONレスポンス用に辞書化"""
        return {
            "fld_コースID": self.fld_コースID,
            "fld_コース名": self.fld_コース名,
            "fld_車格": self.fld_車格,
            "fld_積み方ID": self.fld_積み方ID,
            "fld_KR便名": self.fld_KR便名,
            "fld_仕分日係数": self.fld_仕分日係数
        }    

class Clients(db.Model):
    __tablename__ = 'clients'

    fld_取引先ID: Mapped[int] = mapped_column(INTEGER(11), primary_key=True)
    fld_会社名: Mapped[Optional[str]] = mapped_column(String(255))
    
    def to_dict(self):
        """JSONレスポンス用に辞書化"""
        return {
            "fld_取引先ID": self.fld_取引先ID,
            "fld_会社名": self.fld_会社名
        }

class LoadingMethods(db.Model):
    __tablename__ = 'loading_methods'

    fld_積み方ID: Mapped[str] = mapped_column(String(255))
    id: Mapped[int] = mapped_column(INTEGER(11), primary_key=True)
    fld_赤PL: Mapped[Optional[int]] = mapped_column(INTEGER(11))
    fld_平PL: Mapped[Optional[int]] = mapped_column(INTEGER(11))
    fld_青PL: Mapped[Optional[int]] = mapped_column(INTEGER(11))
    fld_段PL: Mapped[Optional[int]] = mapped_column(INTEGER(11))
    
    def to_dict(self):
        """JSONレスポンス用に辞書化"""
        return {
            "fld_積み方ID": self.fld_積み方ID,
            "id": self.id,
            "fld_赤PL": self.fld_赤PL,
            "fld_平PL": self.fld_平PL,
            "fld_青PL": self.fld_青PL,
            "fld_段PL": self.fld_段PL
        }    

class LoadingData(db.Model):
    __tablename__ = 'loading_data'

    fld_積込量ID: Mapped[int] = mapped_column(INTEGER(11), primary_key=True)
    fld_仕分日: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    fld_コースID: Mapped[Optional[int]] = mapped_column(SMALLINT(6))
    fld_コース内グループ: Mapped[Optional[str]] = mapped_column(String(255))
    fld_赤クレート数: Mapped[Optional[int]] = mapped_column(INTEGER(11))
    fld_平クレート数: Mapped[Optional[int]] = mapped_column(INTEGER(11))
    fld_青クレート数: Mapped[Optional[int]] = mapped_column(INTEGER(11))
    fld_段ボール数: Mapped[Optional[int]] = mapped_column(INTEGER(11))
    fld_学乳数: Mapped[Optional[int]] = mapped_column(INTEGER(11))
    fld_データ入力日: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime)
    
    def to_dict(self):
        """JSONレスポンス用に辞書化"""
        return {
            "fld_積込量ID": self.fld_積込量ID,
            "fld_仕分日": self.fld_仕分日.strftime("%Y-%m-%d") if self.fld_仕分日 else None,
            "fld_コースID": self.fld_コースID,
            #"fld_コース内グループ": self.fld_コース内グループ,
            "fld_赤クレート数": self.fld_赤クレート数,
            "fld_平クレート数": self.fld_平クレート数,
            "fld_青クレート数": self.fld_青クレート数,
            "fld_段ボール数": self.fld_段ボール数,
            "fld_学乳数": self.fld_学乳数,
            "fld_データ入力日": self.fld_データ入力日.strftime("%Y-%m-%d") if self.fld_データ入力日 else None,
        }
