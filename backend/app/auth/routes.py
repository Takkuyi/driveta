from flask import Blueprint, request, jsonify
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
        login_user(user)
        return jsonify({"message": "ログイン成功", "username": user.username})
    else:
        return jsonify({"error": "ログイン失敗：ユーザー名またはパスワードが間違っています"}), 401
    
# ✅ ログアウトAPIの追加
@login_bp.route("/auth/logout", methods=["POST"])
@login_required
def logout():
    logout_user()
    return jsonify({"message": "ログアウトしました"})

# ✅ 認証確認API（デバッグ用にも便利）
@login_bp.route("/auth/status", methods=["GET"])
@login_required
def status():
    return jsonify({"message": "ログイン中", "username": current_user.username})
