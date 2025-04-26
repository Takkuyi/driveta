import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate 
from .extensions import db, cors, login_manager, migrate
from .config import DevelopmentConfig, ProductionConfig
#from .vehicle.models import Vehicle
from app.vehicle.routes import vehicle_bp
from app.Hluggage.routes import routes_bp as hluggage_bp
from app.Hluggage import models as hluggage_models

#db = SQLAlchemy()
migrate = Migrate()  # ← Flask-Migrate のインスタンス作成

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
    cors.init_app(app)
    login_manager.init_app(app)

    # Modelインポート
    from .auth.models import User
    from .etc.models import ETCUsage
    from .vehicle.models import ICVehicleRaw
    from .Hluggage.models import CrateWeights, CourseGroups, Courses, Clients, LoadingData, LoadingMethods

    # Blueprint登録
    from .auth.routes import login_bp
    from .etc.routes import routes_bp
    from .vehicle.routes import vehicle_bp
  
    app.register_blueprint(login_bp)
    app.register_blueprint(routes_bp)
    app.register_blueprint(vehicle_bp)
    app.register_blueprint(hluggage_bp, url_prefix="/hluggage")

    return app