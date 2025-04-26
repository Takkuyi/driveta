from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_login import LoginManager
from flask_migrate import Migrate

db = SQLAlchemy()
cors = CORS()
login_manager = LoginManager()
migrate = Migrate()

from app.auth.models import User

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))