# backend/create_user.py

from app import create_app
from app.extensions import db
from app.auth.models import User
from werkzeug.security import generate_password_hash
import sys

def create_user(username, password, role='user'):
    """新しいユーザーを作成"""
    app = create_app()
    
    with app.app_context():
        # 既存ユーザーのチェック
        existing_user = User.query.filter_by(username=username).first()
        if existing_user:
            print(f"❌ ユーザー '{username}' は既に存在します")
            return False
        
        # 新しいユーザーを作成
        new_user = User(
            username=username,
            password_hash=generate_password_hash(password),
            role=role
        )
        
        try:
            db.session.add(new_user)
            db.session.commit()
            print(f"✅ ユーザー '{username}' を作成しました (権限: {role})")
            return True
        except Exception as e:
            db.session.rollback()
            print(f"❌ ユーザー作成エラー: {e}")
            return False

def list_users():
    """既存ユーザーの一覧表示"""
    app = create_app()
    
    with app.app_context():
        users = User.query.all()
        if users:
            print("=== 既存ユーザー一覧 ===")
            for user in users:
                print(f"- {user.username} (権限: {user.role})")
        else:
            print("ユーザーが見つかりません")

def main():
    if len(sys.argv) < 3:
        print("使用方法:")
        print("  python create_user.py <ユーザー名> <パスワード> [権限]")
        print("  python create_user.py --list  # ユーザー一覧表示")
        print("")
        print("例:")
        print("  python create_user.py admin admin123 admin")
        print("  python create_user.py user001 password123 user")
        return
    
    if sys.argv[1] == '--list':
        list_users()
        return
    
    username = sys.argv[1]
    password = sys.argv[2]
    role = sys.argv[3] if len(sys.argv) > 3 else 'user'
    
    create_user(username, password, role)

if __name__ == '__main__':
    main()