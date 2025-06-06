# backend/app/extensions.py (修正版)

from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_login import LoginManager
from flask_migrate import Migrate

db = SQLAlchemy()
login_manager = LoginManager()
migrate = Migrate()

# CORS設定を修正
def init_cors(app):
    """CORS設定を初期化"""
    cors = CORS(app, 
        origins=['http://localhost:3000', 'http://127.0.0.1:3000'],
        supports_credentials=True,  # クッキーを許可
        allow_headers=['Content-Type', 'Authorization'],
        methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    )
    return cors

from app.auth.models import User

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))