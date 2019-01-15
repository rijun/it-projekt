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

from flask import Flask, request, jsonify, make_response
from pymysql import connect

app = Flask(__name__, static_url_path='', static_folder='../frontend')  # Create Flask application

# String templates
date_format = "%Y-%m-%d"
month_format = "%Y-%m"
year_format = "%Y"


@app.before_first_request   # Runs this function first before accepting a request
def setup_database_connector():
    """
    This function reads the MySQL database settings stored in the configuration file "config.ini".
    The file should be located in the same folder as the script is running from.
    """
    global database

    chdir(path.dirname(__file__))   # Change working directory to the location of backend.py
    config = ConfigParser()
    config.read("config.ini")

    settings = {}

    # Catch error if MySQL Settings section is not in configuration file
    try:
        for key in config["MySQL Settings"]:
            settings[key] = config["MySQL Settings"][key]
    except KeyError:
        print("MySQL settings section not found!")
        quit()

    # Catch error if one of the database settings is not in the configuration file
    try:
        database = connect(
            host=settings["host"],
            port=int(settings["port"]),
            user=settings["user"],
            passwd=settings["password"],
            database=settings["database"]
        )
    except KeyError:
        print("Host, user, password or database entry is missing in config.ini!")
        quit(-1)


@app.route('/')
def root():
    """
    This function returns the website which serves as the frontend for this application.

    :return: Website index.html
    :rtype: HTML file
    """
    return app.send_static_file('index.html')


@app.route('/users')
def get_users():
    """
    This function returns a JSON object containing a list of all people who are stored in the table 'zaehlpunkte',
    with their meter number, name and address.

    :return: List of all rows in table 'zaehlpunkte'
    :rtype: JSON
    """
    meter_list = []
    cursor = database.cursor()

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
        'users': meter_list
    }

    return jsonify(response_dict)


@app.route('/min-max')
def get_min_max():
    """
    This function returns a JSON object containing the smallest and largest date stored in the table 'zaehlwerte'
    for a specified user.

    :return: Min/max date values of all entrys for a specified user
    :rtype: JSON
    """
    user = request.args['u']
    cursor = database.cursor()
    max_date = ""
    min_date = ""

    cursor.execute("SELECT MAX(datum_zeit) FROM zaehlwerte WHERE zaehler_id = '{}'".format(user))

    for result in cursor:
        max_date = datetime.strftime(result[0], date_format)     # result contains only one entry

    cursor.execute("SELECT MIN(datum_zeit) FROM zaehlwerte WHERE zaehler_id = '{}'".format(user))

    for result in cursor:
        min_date = datetime.strftime(result[0], date_format)     # result contains only one entry

    response_dict = {
        'max_date': max_date,
        'min_date': min_date
    }

    return jsonify(response_dict)


@app.route('/data')
def get_data():
    """
    This function gets all meter readings and  current loads in a specified time interval and for a specified user.
    Additionally, the min, max and average load are calculated.

    :return: All entries from the SQL query result and some statistical data, converted to JSON
    :rtype: JSON
    """
    response = ""

    try:
        mode = request.args['mode']
        user = request.args['u']

        # Generate SQL query according to selected mode and dates/times

        if mode == 'day':
            day = datetime.strptime(request.args['d'], date_format)
            next_day = day + timedelta(days=1)
            resolution = request.args['r']

            query = "SELECT DATE_FORMAT(datum_zeit, '%Y-%m-%d %H:%i'), obis_180 FROM zaehlwerte " \
                    "WHERE datum_zeit BETWEEN '{0} 00:00:00' AND '{1}' AND MINUTE (datum_zeit) % {2} = 0 " \
                    "AND zaehler_id = '{3}' ORDER BY datum_zeit ASC"\
                .format(day.date(), next_day.date(), resolution, user)

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


# Get the database results according to the SQL query
def get_db_values(query):
    """
    This function executes the SQL query which is passed as an argument. Afterwards, it calculates the load differences
    between two following dates or times and adds this to the return dictionary. The min, max and average load values
    are calculated and added as well.

    :param query: The SQL query to be executed
    :type query: str
    :return: All entries from the SQL query result and some statistical data
    :rtype: dict
    """
    times = []
    meter_readings = []
    energy_diffs = []
    cursor = database.cursor()

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


def add_month(date):
    """
    This function increments a given month by one month.

    :param date: The date which has to be increased by one month
    :type date: datetime
    :return: The incremented month
    :rtype: datetime
    """
    date_string = datetime.strftime(date, month_format)
    str_list = date_string.split("-")

    if int(str_list[1]) == 12:
        next_month = str(1)
    else:
        next_month = str(int(str_list[1]) + 1)

    return_str = str_list[0] + "-" + next_month
    return datetime.strptime(return_str, month_format)


def add_year(date):
    """
    This function increments a given year by one year.

    :param date: The date which has to be increased by one year
    :type date: datetime
    :return: The incremented year
    :rtype: datetime
    """
    date_string = datetime.strftime(date, year_format)
    next_year = str(int(date_string) + 1)
    return_str = next_year
    return datetime.strptime(return_str, year_format)


# Run Flask server with the selected settings
if __name__ == '__main__':
    app.run(port='5000', debug=True)
