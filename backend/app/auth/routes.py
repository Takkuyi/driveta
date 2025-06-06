# backend/app/auth/routes.py
from flask import Blueprint, request, jsonify, session
from werkzeug.security import check_password_hash
from flask_login import login_user, logout_user, login_required, current_user
from app.extensions import db
from .models import User

# URL プレフィックスを追加
login_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

@login_bp.route("/login", methods=["POST"])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"error": "ユーザー名とパスワードが必要です"}), 400

    user = User.query.filter_by(username=username).first()
    if user and check_password_hash(user.password_hash, password):
        login_user(user, remember=True)
        session.permanent = True
        
        return jsonify({
            "message": "ログイン成功", 
            "username": user.username,
            "user_id": user.id
        })
    else:
        return jsonify({"error": "ログイン失敗：ユーザー名またはパスワードが間違っています"}), 401

# デバッグ用のGETエンドポイント
@login_bp.route("/login", methods=["GET"])
def login_info():
    return jsonify({
        "message": "ログインエンドポイント",
        "method": "POST",
        "url": "/api/auth/login",
        "required_fields": ["username", "password"],
        "example": {
            "username": "admin",
            "password": "admin123"
        }
    })

@login_bp.route("/logout", methods=["POST"])
@login_required
def logout():
    logout_user()
    session.clear()
    return jsonify({"message": "ログアウトしました"})

@login_bp.route("/status", methods=["GET"])
def status():
    if current_user.is_authenticated:
        return jsonify({
            "authenticated": True,
            "username": current_user.username,
            "user_id": current_user.id
        })
    else:
        return jsonify({"authenticated": False}), 401

# デバッグ用：すべての認証エンドポイントを表示
@login_bp.route("/", methods=["GET"])
def auth_endpoints():
    return jsonify({
        "available_endpoints": {
            "POST /api/auth/login": "ログイン",
            "GET /api/auth/login": "ログインエンドポイント情報",
            "POST /api/auth/logout": "ログアウト",
            "GET /api/auth/status": "認証状態確認"
        }
    })