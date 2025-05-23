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

    # Supabase設定
#    SUPABASE_URL = os.environ.get('SUPABASE_URL')
#    SUPABASE_KEY = os.environ.get('SUPABASE_KEY')
#    SUPABASE_STORAGE_BUCKET = os.environ.get('SUPABASE_STORAGE_BUCKET') or 'maintenance-files'
    
    # 一時ファイル用ディレクトリ（アップロード処理中のみ使用）
#    TEMP_FOLDER = os.environ.get('TEMP_FOLDER') or os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'temp')
    
    # 開発環境のDB接続設定
    # SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://devuser:devpassword@localhost/vehicle_maintenance_db?charset=utf8mb4'
    # SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://krdb_user:g7HEKnWs@localhost/krdb'

class ProductionConfig(Config):
    """本番環境用の設定"""
    DEBUG = False  # デバッグモードOFF
    #SQLALCHEMY_DATABASE_URI = "mysql+pymysql://krdb_user:dT26e5GH@192.168.1.205/krdb"
