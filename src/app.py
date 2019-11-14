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

from flask import Flask, render_template, request, jsonify, make_response

from dbhandler import DatabaseHandler

app = Flask(__name__)  # Create Flask application
db = DatabaseHandler()

# String templates
DATE_FORMAT = "%Y-%m-%d"
MONTH_FORMAT = "%Y-%m"
YEAR_FORMAT = "%Y"


def get_available_meters():
    meter_list = []
    db_result = db.select("SELECT * FROM zaehlpunkte")

    for result in db_result:
        meter_list.append({
            'id': result[0],  # result[0] --> zaehler_id
            'lastname': result[1],  # result[1] --> kunde_name
            'firstname': result[2],  # result[2] --> kunde_vorname
            'zipcode': result[3],  # result[3] --> plz
            'city': result[4]  # result[4] --> ort
        })

    for meter in meter_list:
        meter_min = db.select("SELECT MIN(datum_zeit) FROM zaehlwerte WHERE zaehler_id = ?", meter['id'])
        meter_max = db.select("SELECT MAX(datum_zeit) FROM zaehlwerte WHERE zaehler_id = ?", meter['id'])
        meter['min'] = meter_min
        meter['max'] = meter_max

    return meter_list


def add_month(date):
    """This function increments a given month by one month.

    :param date: The date which has to be increased by one month
    :type date: datetime
    :return: The incremented month
    :rtype: datetime
    """
    date_string = datetime.strftime(date, MONTH_FORMAT)
    str_list = date_string.split("-")

    if int(str_list[1]) == 12:
        next_month = str(1)
    else:
        next_month = str(int(str_list[1]) + 1)

    return_str = str_list[0] + "-" + next_month
    return datetime.strptime(return_str, MONTH_FORMAT)


def add_year(date):
    """This function increments a given year by one year.

    :param date: The date which has to be increased by one year
    :type date: datetime
    :return: The incremented year
    :rtype: datetime
    """
    date_string = datetime.strftime(date, YEAR_FORMAT)
    next_year = str(int(date_string) + 1)
    return_str = next_year
    return datetime.strptime(return_str, YEAR_FORMAT)


def build_response_dict(result):
    """
        Calculate the load differences between two following dates or times and adds this to the return dictionary.
        The min, max and average load values are calculated and added as well.

        :param query: The result of a SQL query
        :type query: list
        :return: All entries from the SQL query result and some statistical data
        :rtype: dict
        """
    times = []
    meter_readings = []
    energy_diffs = []

    for res in result:
        times.append(res[0])                    # res[0] --> datum_zeit
        meter_readings.append(float(res[1]))    # res[1] --> obis_180

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


@app.route('/')
def root():
    """
    This function returns the website which serves as the frontend for this application.

    :return: Website index.html
    :rtype: HTML file
    """

    stored_meters = get_available_meters()
    return render_template('index.html', meters=stored_meters)


@app.route('/meter/<meter_id>/<mode>')
def meters(meter_id, mode):
    """
    This function gets all meter readings and  current loads in a specified time interval and for a specified meter.
    Additionally, the min, max and average load are calculated.

    :return: All entries from the SQL query result and some statistical data, converted to JSON
    :rtype: JSON
    """

    try:
        selected_mode = mode
        selected_meter = meter_id
        query = ""

        # Generate SQL query according to selected mode and dates/times
        if selected_mode == 'day':
            day = datetime.strptime(request.args['d'], "%Y-%m-%d")
            next_day = day + timedelta(days=1)
            resolution = request.args['r']

            query = "SELECT DATETIME(datum_zeit), obis_180 FROM zaehlwerte WHERE datum_zeit BETWEEN '{0} 00:00:00' " \
                    "AND '{1}' AND STRFTIME('%M', datum_zeit) % {2} = 0 AND zaehler_id = '{3}' ORDER BY datum_zeit " \
                    "ASC".format(day.date(), next_day.date(), resolution, selected_meter)

        elif selected_mode == 'interval':
            start_day = datetime.strptime(request.args['sd'], DATE_FORMAT)
            end_day = datetime.strptime(request.args['ed'], DATE_FORMAT)
            next_day = end_day + timedelta(days=1)

            query = "SELECT DATE(datum_zeit), obis_180 FROM zaehlwerte WHERE DATE(datum_zeit) BETWEEN '{0}' AND '{1}' " \
                    "AND zaehler_id = '{2}' AND TIME(datum_zeit) = '00:00:00' ORDER BY datum_zeit ASC"\
                .format(start_day.date(), next_day.date(), selected_meter)

        elif selected_mode == 'month':
            month = datetime.strptime(request.args['m'], MONTH_FORMAT)
            next_month = add_month(month)

            query = "SELECT DATE(datum_zeit), obis_180 FROM zaehlwerte WHERE DATE(datum_zeit) BETWEEN '{0}' AND '{1}' " \
                    "AND TIME(datum_zeit) = '00:00:00' AND zaehler_id = '{2}' ORDER BY datum_zeit ASC"\
                .format(month.strftime(DATE_FORMAT), next_month.strftime(DATE_FORMAT), selected_meter)

        elif selected_mode == 'year':
            year = datetime.strptime(request.args['y'], YEAR_FORMAT)
            next_year = add_year(year)

            query = "SELECT DATE(datum_zeit, '%Y-%m-%d'), obis_180 FROM zaehlwerte WHERE STRFTIME('%Y', datum_zeit) " \
                    "BETWEEN '{0}' AND '{1}' AND STRFTIME('%d', datum_zeit) = '01' AND TIME(datum_zeit) = '00:00:00' " \
                    "AND zaehler_id = '{2}' ORDER BY datum_zeit ASC"\
                .format(year.strftime(YEAR_FORMAT), next_year.strftime(YEAR_FORMAT), selected_meter)

        response = build_response_dict(db.select(query))

    # Send 400 (bad request) response with error details if an error occurred
    except ValueError:
        return make_response("Datum falsch oder nicht vorhanden!", 400)
    except IndexError:
        return make_response("Zählernummer falsch oder nicht vorhanden!", 400)
    else:
        return jsonify(response)


# Run Flask server with the selected settings
if __name__ == '__main__':
    app.run(host='0.0.0.0', port='5000', debug=True)  # Visible in network
    # app.run(port='5000', debug=True)    # Not visible in network, only on localhost
