"""
This script runs the application using a development server.
It contains the definition of routes and views for the application.
"""

from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
import pymysql
import datetime

app = Flask(__name__)
CORS(app)

# Make the WSGI interface available at the top level so wfastcgi can get it.
wsgi_app = app.wsgi_app

my_Database = pymysql.connect(
    host="127.0.0.1",
    user="root",
    passwd="",  # Michel: root
    database="itp_2018_bsp02"  # Michel: itp2
)


def get_day_values(time, res):
    date = []
    energy = []
    diff = []
    mycursor = my_Database.cursor()
    query = "SELECT datum_zeit, obis_180 FROM zaehlwerte WHERE (DATE_FORMAT (datum_zeit, '%Y-%m-%d')) = '{0}' AND MINUTE (datum_zeit) % {1} = 0 ".format(
        time, res)
    mycursor.execute(query)
    for result in mycursor:
        date.append(datetime.datetime.strftime(result[0], "%H:%M"))
        energy.append(float(result[1]))

    for i in range(0, len(energy) - 1):
        diff.append(float(energy[i + 1] - energy[i]))
    data = {
        'dates': date,
        'diff': diff,
        'energy': energy
    }
    return data


def get_interval_values(start_time, end_time):
    date = []
    energy = []
    diff = []
    mycursor = my_Database.cursor()
    query = (
        "SELECT DATE_FORMAT(datum_zeit, '%Y-%m-%d'), obis_180 FROM zaehlwerte WHERE DATE_FORMAT(datum_zeit, '%Y-%m-%d') BETWEEN '{0}' AND '{1}' AND DATE_FORMAT(datum_zeit, '%T') = '00:01:00'").format(
        start_time, end_time)
    mycursor.execute(query)
    for result in mycursor:
        date.append(result[0])
        energy.append(float(result[1]))
    for i in range(0, len(energy) - 1):
        diff.append(float(energy[i + 1] - energy[i]))
    data = {
        'dates': date,
        'diff': diff,
        'energy': energy
    }
    return data


def get_month_values(year, month):
    date = []
    energy = []
    diff = []
    mycursor = my_Database.cursor()
    query = "SELECT DATE_FORMAT(datum_zeit, '%Y-%m-%d'), obis_180 FROM zaehlwerte WHERE YEAR (datum_zeit) = '{0}' AND MONTH (datum_zeit) = '{1}' AND DATE_FORMAT(datum_zeit, '%T') = '00:01:00'".format(
        year, month)
    mycursor.execute(query)
    for result in mycursor:
        date.append(result[0])
        energy.append(float(result[1]))
    for i in range(0, len(energy) - 1):
        diff.append(float(energy[i + 1] - energy[i]))
    data = {
        'dates': date,
        'diff': diff,
        'energy': energy
    }
    return data


def get_year_values(time):
    date = []
    energy = []
    diff = []
    mycursor = my_Database.cursor()
    query = (
        "SELECT  DATE_FORMAT (datum_zeit, '%Y-%m-%d'), obis_180 FROM zaehlwerte WHERE YEAR (datum_zeit) = '{0}' AND DATE_FORMAT(datum_zeit, '%e') = 1 AND DATE_FORMAT(datum_zeit, '%T') = '00:01:00'").format(
        time)
    mycursor.execute(query)
    for result in mycursor:
        date.append(result[0])
        energy.append(result[1])
    for i in range(0, len(energy) - 1):
        diff.append(energy[i + 1] - energy[i])
    data = {
        'dates': date,
        'diff': diff,
        'energy': energy
    }
    return data


@app.route('/data')
def get_data():
    mode = request.args['mode']
    if mode == 'day':
        day = request.args['d']
        res = request.args['r']
        response = (get_day_values(day, res))
    elif mode == 'interval':
        start_time = request.args['st']
        end_time = request.args['et']
        response = get_interval_values(start_time, end_time)
    elif mode == 'month':
        month = request.args['m']
        year = request.args['y']
        response = get_month_values(year, month)
    elif mode == 'year':
        year = request.args['y']
        response = get_year_values(year)
    else:
        # return make_response(('not_found.html'),404)
        # def http_404_handler():
        return make_response("<h2>404 Error</h2>", 400)
    return jsonify(response)


if __name__ == '__main__':
    app.run(port='5000', debug=True)
