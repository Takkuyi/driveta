import os
from dotenv import load_dotenv

load_dotenv()  # .envファイルを読み込む

class Config:
    SQLALCHEMY_TRACK_MODIFICATIONS = False  # 警告を抑制
    SECRET_KEY = os.environ.get("SECRET_KEY") or "change_this_default_secret"  # セッション管理用の秘密鍵

class DevelopmentConfig(Config):
    """開発環境用の設定"""
    DEBUG = True  # デバッグモードON
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL") # .env から取得
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    # 開発環境のDB接続設定
#    SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://devuser:devpassword@localhost/vehicle_maintenance_db?charset=utf8mb4'
   # SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://krdb_user:g7HEKnWs@localhost/krdb'

class ProductionConfig(Config):
    """本番環境用の設定"""
    DEBUG = False  # デバッグモードOFF
    #SQLALCHEMY_DATABASE_URI = "mysql+pymysql://krdb_user:dT26e5GH@192.168.1.205/krdb"
