# backend/app/auth/routes.py (修正版)

from flask import Blueprint, request, jsonify
from werkzeug.security import check_password_hash
from flask_login import login_user, logout_user, login_required, current_user
from app.extensions import db
from .models import User

# Blueprint を正しく定義
login_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

@login_bp.route("/login", methods=["POST"])
def login():
    """ログイン処理"""
    try:
        data = request.json
        
        if not data:
            return jsonify({"error": "リクエストデータがありません"}), 400
        
        username = data.get("username")
        password = data.get("password")

        if not username or not password:
            return jsonify({"error": "ユーザー名とパスワードが必要です"}), 400

        # ユーザーの検索
        user = User.query.filter_by(username=username).first()
        
        if not user:
            return jsonify({"error": "ユーザーが見つかりません"}), 401
        
        # パスワードの確認
        if not check_password_hash(user.password_hash, password):
            return jsonify({"error": "パスワードが間違っています"}), 401
        
        # ログイン処理
        login_user(user)
        
        return jsonify({
            "message": "ログイン成功", 
            "username": user.username,
            "role": user.role
        }), 200
        
    except Exception as e:
        print(f"ログインエラー: {e}")  # デバッグ用
        return jsonify({"error": f"ログイン処理中にエラーが発生しました: {str(e)}"}), 500

@login_bp.route("/logout", methods=["POST"])
@login_required
def logout():
    """ログアウト処理"""
    try:
        logout_user()
        return jsonify({"message": "ログアウトしました"}), 200
    except Exception as e:
        return jsonify({"error": f"ログアウト処理中にエラーが発生しました: {str(e)}"}), 500

@login_bp.route("/status", methods=["GET"])
def status():
    """認証状態確認"""
    try:
        if current_user.is_authenticated:
            return jsonify({
                "message": "ログイン中", 
                "username": current_user.username,
                "role": current_user.role
            }), 200
        else:
            return jsonify({"error": "未認証"}), 401
    except Exception as e:
        return jsonify({"error": f"認証状態確認中にエラーが発生しました: {str(e)}"}), 500

# デバッグ用のテストエンドポイント
@login_bp.route("/test", methods=["GET"])
def test():
    """認証システムテスト"""
    try:
        # ユーザー数を確認
        user_count = User.query.count()
        users = User.query.all()
        user_list = [{"username": u.username, "role": u.role} for u in users]
        
        return jsonify({
            "message": "認証システム正常",
            "user_count": user_count,
            "users": user_list
        }), 200
    except Exception as e:
        return jsonify({"error": f"テスト中にエラーが発生しました: {str(e)}"}), 500