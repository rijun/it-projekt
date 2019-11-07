"""
This script runs a flask server.

Requirements: flask, pymysql

Usage:  @app.route('/foo') creates an API endpoint to which an GET/POST request can be sent, e.g. http://bar.com/foo
        Request arguments can be accessed by: request.args["<request_variable_name>"]
"""
from configparser import ConfigParser
from datetime import datetime, timedelta
from math import floor
from os import chdir, path
from statistics import mean

from flask import Flask, render_template, jsonify

from dbhandler import DatabaseHandler

app = Flask(__name__)  # Create Flask application
db = DatabaseHandler()


def get_available_meters():
    meter_list = []
    db_result = db.select("SELECT * FROM zaehlpunkte")

    for result in db_result:
        meter_list.append({
            'id': result[0],            # result[0] --> zaehler_id
            'lastname': result[1],      # result[1] --> kunde_name
            'firstname': result[2],     # result[2] --> kunde_vorname
            'zipcode': result[3],       # result[3] --> plz
            'city': result[4]           # result[4] --> ort
        })

    for meter in meter_list:
        meter_min = db.select("SELECT MIN(datum_zeit) FROM zaehlwerte WHERE zaehler_id = ?", meter['id'])
        meter_max = db.select("SELECT MAX(datum_zeit) FROM zaehlwerte WHERE zaehler_id = ?", meter['id'])
        meter['min'] = meter_min
        meter['max'] = meter_max

    return meter_list


@app.route('/')
def root():
    """
    This function returns the website which serves as the frontend for this application.

    :return: Website index.html
    :rtype: HTML file
    """

    meters = get_available_meters()
    return render_template('index.html', meters=meters)


# Run Flask server with the selected settings
if __name__ == '__main__':
    app.run(host='0.0.0.0', port='5000', debug=True)   # Visible in network
    # app.run(port='5000', debug=True)    # Not visible in network, only on localhost
