"""
This script runs a flask server

Requirements: flask, flask_cors, pymysql

- flask_cors is used to allow cross-origin requests
- pymysql is the database connector, an alternate connecter can also be used

Usage:  @app.route('/foo') creates an API endpoint to which an GET/POST request can be sent, e.g. http://bar.com/foo
        Request arguments can be used with: request.args["<request_variable_name>"]
"""

from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
from datetime import datetime, timedelta
from pymysql import connect
from math import floor
from statistics import mean

app = Flask(__name__)  # Create Flask application
CORS(app)  # Enable CORS for allowing cross-origin requests

my_Database = connect(
    host="127.0.0.1",
    user="root",
    passwd="",  # Michel: root
    database="itp_2018"  # Michel: itp2
)

# String templates
date_format = "%Y-%m-%d"
month_format = "%Y-%m"
year_format = "%Y"


# Get the database results according to the SQL query
def get_db_values(query):
    times = []
    meter_readings = []
    energy_diffs = []
    cursor = my_Database.cursor()

    cursor.execute(query)

    for result in cursor:
        times.append(result[0])                     # result[0] --> datum_zeit
        meter_readings.append(float(result[1]))     # result[1] --> obis_180

    for i in range(len(times) - 1):
        energy_diffs.append((floor(meter_readings[i + 1] * 100) - floor(meter_readings[i] * 100)) / 100)

    # Remove last entries as times and meter_readings are larger than energy_diffs
    times.pop()
    meter_readings.pop()

    response_dict = {
        'times': times,
        'energy_diffs': energy_diffs,
        'meter_readings': meter_readings,
        'min': min(energy_diffs),
        'max': max(energy_diffs),
        'avg': round(mean(energy_diffs), 3),
        'sum': round(sum(energy_diffs), 2)
    }

    return response_dict


# Helper function for incrementing months
def add_month(date):
    date_string = datetime.strftime(date, month_format)
    str_list = date_string.split("-")

    if int(str_list[1]) == 12:
        next_month = 1
    else:
        next_month = str(int(str_list[1]) + 1)

    return_str = str_list[0] + "-" + next_month
    return datetime.strptime(return_str, month_format)


# Helper function for incrementing years
def add_year(date):
    date_string = datetime.strftime(date, year_format)
    next_year = str(int(date_string) + 1)
    return_str = next_year
    return datetime.strptime(return_str, year_format)


@app.route('/data')
def get_data():
    response = ""

    try:
        mode = request.args['mode']
        user = request.args['u']

        # Generate SQL query according to selected mode and dates/times

        if mode == 'day':
            day = datetime.strptime(request.args['d'], date_format)
            next_day = day + timedelta(days=1)
            resolution = request.args['r']
            query = "SELECT DATE_FORMAT(datum_zeit, '%H:%i'), obis_180 FROM zaehlwerte " \
                    "WHERE datum_zeit BETWEEN '{0} 00:00:00' AND '{1}' AND MINUTE (datum_zeit) % {2} = 0 " \
                    "AND zaehler_id = '{3}' ORDER BY datum_zeit ASC".format(day.date(), next_day.date(), resolution, user)
            response = get_db_values(query)

        elif mode == 'interval':
            start_day = datetime.strptime(request.args['sd'], date_format)
            end_day = datetime.strptime(request.args['ed'], date_format)
            next_day = end_day + timedelta(days=1)
            query = "SELECT DATE_FORMAT(datum_zeit, '%Y-%m-%d'), obis_180 FROM zaehlwerte " \
                    "WHERE DATE_FORMAT(datum_zeit, '%Y-%m-%d') BETWEEN '{0}' AND '{1}' " \
                    "AND zaehler_id = '{2}' AND DATE_FORMAT(datum_zeit, '%T') = '00:00:00' ORDER BY datum_zeit ASC" \
                .format(start_day.date(), next_day.date(), user)
            response = get_db_values(query)

        elif mode == 'month':
            month = datetime.strptime(request.args['m'], month_format)
            next_month = add_month(month)
            query = "SELECT DATE_FORMAT(datum_zeit, '%Y-%m-%d'), obis_180 FROM zaehlwerte " \
                    "WHERE DATE_FORMAT(datum_zeit, '%Y-%m-%d') BETWEEN '{0}' AND '{1}' " \
                    "AND DATE_FORMAT(datum_zeit, '%T') = '00:00:00' AND zaehler_id = '{2}' ORDER BY datum_zeit ASC" \
                .format(month.strftime(date_format), next_month.strftime(date_format), user)
            response = get_db_values(query)

        elif mode == 'year':
            year = datetime.strptime(request.args['y'], year_format)
            next_year = add_year(year)
            query = "SELECT  DATE_FORMAT (datum_zeit, '%Y-%m-%d'), obis_180 FROM zaehlwerte " \
                    "WHERE YEAR (datum_zeit) BETWEEN '{0}' AND '{1}' AND DAY (datum_zeit) = '01' " \
                    "AND DATE_FORMAT(datum_zeit, '%T') = '00:00:00'  AND zaehler_id = '{2}' ORDER BY datum_zeit ASC" \
                .format(year.strftime(year_format), next_year.strftime(year_format), user)
            response = get_db_values(query)

    # Send 400 (bad request) response with error details if an error occurred
    except ValueError:
        return make_response("Datum falsch oder nicht vorhanden!", 400)
    except IndexError:
        return make_response("Zählernummer falsch oder nicht vorhanden!", 400)

    else:
        return jsonify(response)


# Get all available users and their personal information stored in the database
@app.route('/users')
def get_users():
    meter_list = []
    cursor = my_Database.cursor()

    cursor.execute("SELECT DISTINCT * FROM zaehlpunkte")

    for result in cursor:
        meter_list.append({
            'number': result[0],        # result[0] --> zaehler_id
            'lastname': result[1],      # result[1] --> kunde_name
            'firstname': result[2],     # result[2] --> kunde_vorname
            'zipcode': result[3],       # result[3] --> plz
            'city': result[4]           # result[4] --> ort
        })

    response_dict = {
        'users': meter_list,
    }

    return jsonify(response_dict)


# Get first and last available date of the current user
@app.route('/min-max')
def get_min_max():
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


# Run Flask server with the selected settings
if __name__ == '__main__':
    app.run(port='5000', debug=True)
