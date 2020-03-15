import locale
import os
from datetime import datetime

from flask import Flask


def create_app(test_config=None):
    # Create and configure the app
    app = Flask(__name__)
    app.config.from_mapping(
        DATABASE=os.path.join(app.instance_path, 'itp.db')
    )
    locale.setlocale(locale.LC_ALL, 'de_DE.utf8')

    if test_config is None:
        # load the instance config, if it exists, when not testing
        app.config.from_object('config.Config')
    else:
        # load the test config if passed in
        app.config.from_mapping(test_config)

    # Ensure the instance folder exists
    try:
        os.makedirs(app.instance_path)
    except OSError:
        pass

    from . import db
    db.init_app(app)

    from . import index
    app.register_blueprint(index.bp)
    app.add_url_rule('/', endpoint='index')

    from . import dashboard
    app.register_blueprint(dashboard.bp)

    from . import api
    app.register_blueprint(api.bp)

    app.jinja_env.filters['datetime'] = format_datetime

    return app


def format_datetime(value, fmt='hour'):
    """Custom filter for datetimes"""
    dt = datetime.strptime(value, '%Y-%m-%d %H:%M:%S')
    if fmt == 'hour':
        fmt = '%H:%M'
    elif fmt == 'day':
        fmt = '%D.%m'
    elif fmt == 'month':
        fmt = '%B %Y'
    return dt.strftime(fmt)
