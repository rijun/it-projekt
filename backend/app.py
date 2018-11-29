"""
This script runs the application using a development server.
It contains the definition of routes and views for the application.
"""
from collections import namedtuple

from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
from math import floor
from datetime import datetime, timedelta
import pymysql
from statistics import mean

app = Flask(__name__)
CORS(app)

my_Database = pymysql.connect(
    host="127.0.0.1",
    user="root",
    passwd="",  # Michel: root
    database="itp_2018_bsp02"  # Michel: itp2
)

date_format = "%Y-%m-%d"
month_format = "%Y-%m"
year_format = "%Y"


def get_db_values(query):
    date = []
    energy = []
    diff = []
    cursor = my_Database.cursor()
    cursor.execute(query)

    for result in cursor:
        date.append(result[0])
        energy.append(float(result[1]))

    date.pop()

    for i in range(0, len(date)):
        diff.append((floor(energy[i + 1] * 100) - floor(energy[i] * 100)) / 100)

    data = {
        'dates': date,
        'diff': diff,
        'energy': energy,
        'min': min(diff),
        'max': max(diff),
        'avg': round(mean(diff), 3),
        'sum': sum(diff)
    }
    return data


def add_month(date):
    str_date = datetime.strftime(date, month_format)
    str_list = str_date.split("-")
    if int(str_list[1]) == 12:
        next_month = 1
    else:
        next_month = str(int(str_list[1]) + 1)
    return_str = str_list[0] + "-" + next_month
    return datetime.strptime(return_str, month_format)


def add_year(date):
    str_date = datetime.strftime(date, year_format)
    next_year = str(int(str_date) + 1)
    return_str = next_year
    return datetime.strptime(return_str, year_format)


@app.route('/data')
def get_data():
    try:
        mode = request.args['mode']
        user = request.args['u']

        if mode == 'day':
            day = datetime.strptime(request.args['d'], date_format)
            next_day = day + timedelta(days=1)
            res = request.args['r']
            query = "SELECT DATE_FORMAT(datum_zeit, '%H:%i'), obis_180 FROM zaehlwerte " \
                    "WHERE datum_zeit BETWEEN '{0} 00:00:00' AND '{1}' AND MINUTE (datum_zeit) % {2} = 0 " \
                    "AND zaehler_id = '{3}' ORDER BY datum_zeit ASC".format(day.date(), next_day.date(), res, user)
            response = get_db_values(query)

        elif mode == 'interval':
            start_day = datetime.strptime(request.args['sd'], date_format)
            end_day = datetime.strptime(request.args['ed'], date_format)
            next_day = end_day + timedelta(days=1)
            query = "SELECT DATE_FORMAT(datum_zeit, '%Y-%m-%d'), obis_180 FROM zaehlwerte " \
                    "WHERE DATE_FORMAT(datum_zeit, '%Y-%m-%d') BETWEEN '{0}' AND '{1}' " \
                    "AND zaehler_id = '{2}' AND DATE_FORMAT(datum_zeit, '%T') = '00:00:00' ORDER BY datum_zeit ASC"\
                .format(start_day.date(), next_day.date(), user)
            response = get_db_values(query)

        elif mode == 'month':
            month = datetime.strptime(request.args['m'], month_format)
            next_month = add_month(month)
            # year = request.args['y']
            query = "SELECT DATE_FORMAT(datum_zeit, '%Y-%m-%d'), obis_180 FROM zaehlwerte " \
                    "WHERE DATE_FORMAT(datum_zeit, '%Y-%m-%d') BETWEEN '{0}' AND '{1}' " \
                    "AND DATE_FORMAT(datum_zeit, '%T') = '00:00:00' AND zaehler_id = '{2}' ORDER BY datum_zeit ASC"\
                .format(month.strftime(date_format), next_month.strftime(date_format), user)
            response = get_db_values(query)

        elif mode == 'year':
            year = datetime.strptime(request.args['y'], year_format)
            next_year = add_year(year)
            query = "SELECT  DATE_FORMAT (datum_zeit, '%Y-%m'), obis_180 FROM zaehlwerte " \
                    "WHERE YEAR (datum_zeit) BETWEEN '{0}' AND '{1}' AND DAY (datum_zeit) = '01' "\
                    "AND DATE_FORMAT(datum_zeit, '%T') = '00:00:00'  AND zaehler_id = '{2}' ORDER BY datum_zeit ASC"\
                .format(year.strftime(year_format), next_year.strftime(year_format), user)
            response = get_db_values(query)

    except:
        return make_response("<h2>404 Error</h2>", 400)

    return jsonify(response)


@app.route('/boot')
def boot():
    meter_list = []
    cursor = my_Database.cursor()
    cursor.execute("SELECT DISTINCT * FROM zaehlpunkte")
    for result in cursor:
        meter_list.append({
            'number': result[0],
            'lastname': result[1],
            'firstname': result[2],
            'zipcode': result[3],
            'city': result[4]
        })

    response_dict = {
        'users': meter_list,
    }

    return jsonify(response_dict)


@app.route('/users')
def users():
    user = request.args['u']
    cursor = my_Database.cursor()
    max_date = ""
    min_date = ""
    cursor.execute("SELECT MAX(datum_zeit) FROM zaehlwerte WHERE zaehler_id = '{}'".format(user))
    for result in cursor:
        max_date = datetime.strftime(result[0], date_format)
    cursor.execute("SELECT MIN(datum_zeit) FROM zaehlwerte WHERE zaehler_id = '{}'".format(user))
    for result in cursor:
        min_date = datetime.strftime(result[0], date_format)
    response_dict = {
        'max_date': max_date,
        'min_date': min_date
    }

    return jsonify(response_dict)


if __name__ == '__main__':
    app.run(port='5000', debug=True)
