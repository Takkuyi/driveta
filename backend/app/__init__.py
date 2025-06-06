# backend/app/__init__.py の修正

import os
from flask import Flask, jsonify
from flask_migrate import Migrate 
from .extensions import db, cors, login_manager, migrate
from .config import DevelopmentConfig, ProductionConfig

def create_app():
    app = Flask(__name__)
    app.config['JSON_AS_ASCII'] = False

    # 環境変数から設定を切り替え
    env = os.environ.get("FLASK_ENV", "development")
    if env == "production":
        app.config.from_object(ProductionConfig)
    else:
        app.config.from_object(DevelopmentConfig)

    print(f"🚀 現在の環境: {env}")

    # Flask拡張の初期化
    db.init_app(app)
    migrate.init_app(app, db)
    
    # CORS設定を詳細に指定
    cors.init_app(app, 
                  origins=["http://localhost:3000"],
                  supports_credentials=True,
                  allow_headers=["Content-Type", "Authorization"],
                  methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])
    
    login_manager.init_app(app)
    login_manager.login_view = '/auth/login'
    login_manager.login_message = 'ログインが必要です'

    # Modelインポート
    from .auth.models import User
    from .etc.models import ETCUsage
    from .vehicle.models import Vehicles
    from .Hluggage.models import CrateWeights, CourseGroups, Courses, Clients, LoadingData, LoadingMethods
    from .maintenance.models import MaintenanceType, MaintenanceStatus, MaintenanceSchedule
    from .employee.models import Employee

    # Blueprint登録
    from .auth.routes import login_bp
    from .etc.routes import routes_bp
    from .vehicle.routes import vehicle_bp
    from .Hluggage.routes import Hluggage_bp
    from .maintenance.routes import maintenance_bp
    from .employee.routes import employee_bp

    app.register_blueprint(maintenance_bp)
    app.register_blueprint(login_bp)
    app.register_blueprint(routes_bp)
    app.register_blueprint(vehicle_bp)
    app.register_blueprint(Hluggage_bp)
    app.register_blueprint(employee_bp)

    @app.route("/", methods=["GET"])
    def home():
        return jsonify({"message": "Welcome to the DRIVETA API!", "status": "running"}), 200

    @app.route("/health", methods=["GET"])  
    def health_check():
        return jsonify({"status": "healthy", "service": "DRIVETA"}), 200

    # エラーハンドリング
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"error": "エンドポイントが見つかりません"}), 404

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({"error": "内部サーバーエラーが発生しました"}), 500

    return app