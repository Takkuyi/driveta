# backend/app/auth/routes.py の修正

from flask import Blueprint, request, jsonify, session
from werkzeug.security import check_password_hash
from flask_login import login_user, logout_user, login_required, current_user
from app.extensions import db
from .models import User

login_bp = Blueprint("login", __name__)

@login_bp.route("/auth/login", methods=["POST"])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"error": "ユーザー名とパスワードが必要です"}), 400

    user = User.query.filter_by(username=username).first()
    if user and check_password_hash(user.password_hash, password):
        login_user(user, remember=True)  # remember=True でセッションを永続化
        session.permanent = True  # セッションを永続化
        
        return jsonify({
            "message": "ログイン成功", 
            "username": user.username,
            "user_id": user.id
        })
    else:
        return jsonify({"error": "ログイン失敗：ユーザー名またはパスワードが間違っています"}), 401
    
@login_bp.route("/auth/logout", methods=["POST"])
@login_required
def logout():
    logout_user()
    session.clear()  # セッションをクリア
    return jsonify({"message": "ログアウトしました"})

@login_bp.route("/auth/status", methods=["GET"])
def status():
    if current_user.is_authenticated:
        return jsonify({
            "authenticated": True,
            "username": current_user.username,
            "user_id": current_user.id
        })
    else:
        return jsonify({"authenticated": False}), 401