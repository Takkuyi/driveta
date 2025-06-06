# backend/app/__init__.py (CORS修正版)

import os
from flask import Flask, jsonify
from flask_migrate import Migrate 
from .extensions import db, login_manager, migrate, init_cors
from .config import DevelopmentConfig, ProductionConfig

migrate = Migrate()

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
    init_cors(app)  # CORS設定を修正
    login_manager.init_app(app)

    # セッション設定を強化
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
    app.config['SESSION_COOKIE_SECURE'] = False  # 開発環境ではFalse
    app.config['SESSION_COOKIE_HTTPONLY'] = True
    app.config['PERMANENT_SESSION_LIFETIME'] = 3600  # 1時間
    app.config['SESSION_COOKIE_NAME'] = 'driveta_session'
    
    # LoginManagerの設定
    login_manager.login_view = 'auth.login'
    login_manager.login_message = 'ログインが必要です'
    login_manager.session_protection = 'strong'

    # Modelインポート
    from .auth.models import User
    from .etc.models import ETCUsage
    from .vehicle.models import Vehicles
    from .Hluggage.models import CrateWeights, CourseGroups, Courses, Clients, LoadingData, LoadingMethods
    from .maintenance.models import MaintenanceType, MaintenanceStatus, MaintenanceSchedule, MaintenanceDetail, MaintenanceFile
    from .employee.models import Employee
    from .driving_log.models import DrivingLog, DeliveryDestination, FuelingRecord, CarWashRecord

    # リレーションシップの追加設定
    Employee.driving_logs_as_driver = db.relationship('DrivingLog', foreign_keys='DrivingLog.driver_id', back_populates='driver')
    Vehicles.driving_logs = db.relationship('DrivingLog', back_populates='vehicle')
    Vehicles.fueling_records = db.relationship('FuelingRecord', back_populates='vehicle')
    Vehicles.car_wash_records = db.relationship('CarWashRecord', back_populates='vehicle')

    # Blueprint登録（順序を調整、デバッグ用ログ追加）
    from .auth.routes import login_bp
    from .etc.routes import routes_bp
    from .vehicle.routes import vehicle_bp
    from .Hluggage.routes import Hluggage_bp
    from .maintenance.routes import maintenance_bp
    from .employee.routes import employee_bp
    from .driving_log.routes import driving_log_bp

    # 認証系を最初に登録
    print("🔐 認証Blueprint登録中...")
    app.register_blueprint(login_bp)
    print("✅ 認証Blueprint登録完了: /api/auth")
    
    print("📋 その他Blueprint登録中...")
    app.register_blueprint(maintenance_bp)
    app.register_blueprint(vehicle_bp)
    app.register_blueprint(employee_bp)
    app.register_blueprint(driving_log_bp)
    
    # その他のBlueprint（URL prefixがないものは後で登録）
    app.register_blueprint(routes_bp, url_prefix='/api/etc')  # URL prefixを明示
    app.register_blueprint(Hluggage_bp, url_prefix='/api/hluggage')  # URL prefixを明示
    print("✅ 全Blueprint登録完了")

    @app.route("/", methods=["GET"])
    def home():
        return jsonify({"message": "Welcome to the DRIVETA API!", "status": "running"}), 200

    @app.route("/health", methods=["GET"])  
    def health_check():
        return jsonify({"status": "healthy", "service": "DRIVETA"}), 200
    
    # デバッグ用: 登録されたルートを表示
    @app.route("/routes", methods=["GET"])
    def list_routes():
        routes = []
        for rule in app.url_map.iter_rules():
            routes.append({
                "endpoint": rule.endpoint,
                "methods": list(rule.methods),
                "path": str(rule)
            })
        return jsonify({"routes": routes}), 200

    # エラーハンドリング
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"error": "エンドポイントが見つかりません"}), 404

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({"error": "内部サーバーエラーが発生しました"}), 500

    return app