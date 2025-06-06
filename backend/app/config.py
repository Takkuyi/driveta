# backend/app/config.py に追加

import os
from dotenv import load_dotenv
from datetime import timedelta

load_dotenv()

class Config:
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.environ.get("SECRET_KEY") or "change_this_default_secret"
    
    # セッション設定
    SESSION_COOKIE_SECURE = False  # 開発環境ではFalse（HTTPS環境ではTrue）
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    PERMANENT_SESSION_LIFETIME = timedelta(hours=24)  # セッション有効期限
    
    # CORS設定
    CORS_SUPPORTS_CREDENTIALS = True
    CORS_ORIGINS = ["http://localhost:3000"]  # フロントエンドのURL

class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")
    
    # 開発環境用のCORS設定
    CORS_SUPPORTS_CREDENTIALS = True
    CORS_ORIGINS = ["http://localhost:3000"]

class ProductionConfig(Config):
    DEBUG = False
    SESSION_COOKIE_SECURE = True  # 本番環境ではHTTPS必須