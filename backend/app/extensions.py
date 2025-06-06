# backend/app/extensions.py
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_login import LoginManager
from flask_migrate import Migrate

db = SQLAlchemy()
cors = CORS()
login_manager = LoginManager()
migrate = Migrate()

# User loader は __init__.py で設定する