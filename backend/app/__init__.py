# backend/app/__init__.py
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
    
    # CORS設定
    cors.init_app(app, 
                  origins=["http://localhost:3000", "http://127.0.0.1:3000"],
                  supports_credentials=True,
                  allow_headers=["Content-Type", "Authorization"],
                  methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])
    
    login_manager.init_app(app)
    login_manager.login_view = '/api/auth/login'
    login_manager.login_message = 'ログインが必要です'

    # Modelインポート（User loader設定前に必要）
    from .auth.models import User
    from .etc.models import ETCUsage
    from .vehicle.models import Vehicles
    from .Hluggage.models import CrateWeights, CourseGroups, Courses, Clients, LoadingData, LoadingMethods
    from .maintenance.models import MaintenanceType, MaintenanceStatus, MaintenanceSchedule
    from .employee.models import Employee
    from .fuel.models import EnefleRecord, EneosWingRecord, KitasekiRecord
    
    # User loaderの設定
    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    # Blueprint登録
    from .auth.routes import login_bp
    from .etc.routes import etc_bp
    from .vehicle.routes import vehicle_bp
    from .Hluggage.routes import Hluggage_bp
    from .maintenance.routes import maintenance_bp
    from .employee.routes import employee_bp
    from .fuel.routes import fuel_bp

    # Blueprint登録（順序を整理）
    app.register_blueprint(login_bp)      # /api/auth/*
    app.register_blueprint(vehicle_bp)    # /api/vehicles/*
    app.register_blueprint(maintenance_bp) # /api/maintenance/*
    app.register_blueprint(employee_bp)   # /api/employee/*
    app.register_blueprint(etc_bp)     # /etc/*
    app.register_blueprint(Hluggage_bp)   # /*
    app.register_blueprint(fuel_bp)       # /api/fuel/*

    @app.route("/", methods=["GET"])
    def home():
        return jsonify({"message": "Welcome to the API!"}), 200

    # デバッグ用：登録されたルートを表示
    @app.route("/routes", methods=["GET"])
    def list_routes():
        routes = []
        for rule in app.url_map.iter_rules():
            routes.append({
                "endpoint": rule.endpoint,
                "methods": list(rule.methods),
                "url": str(rule)
            })
        return jsonify(routes)

    return app