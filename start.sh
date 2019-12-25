source env/bin/activate
export FLASK_APP=wsgi.py
export APP_CONFIG_FILE=config.py
flask run
deactivate
