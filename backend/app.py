"""
This script runs the application using a development server.
It contains the definition of routes and views for the application.
"""
import pymysql
from flask import Flask, request, jsonify, Response
APP = Flask(__name__)

# Make the WSGI interface available at the top level so wfastcgi can get it.
WSGI_APP = APP.wsgi_app

MY_DATABASE = pymysql.connect(
    host="127.0.0.1",
    user="root",
    passwd="root",
    database="itp2",
    )

def get_day_values(time, res):
    """return values for day mode"""
    mycursor = MY_DATABASE.cursor()
    query = ("SELECT obis_180, datum_zeit FROM zaehlwerte WHERE (DATE_FORMAT (datum_zeit, '%Y-%m-%d')) = {0} AND MINUTE (datum_zeit) % {1} = 0 ").format(time, res)
    mycursor.execute(query)
    for result in mycursor:
        return '%s %s' %(result[0], result[1])

def get_month_values(year, month):
    """return values for month mode"""
    mycursor = MY_DATABASE.cursor()
    query = ("SELECT obis_180, DATE_FORMAT(datum_zeit, '%Y-%m-%d') FROM zaehlwerte WHERE YEAR (datum_zeit) = {0} AND MONTH (datum_zeit) = {1} AND DATE_FORMAT(datum_zeit, '%T') = '00:01:00'").format(year, month)
    mycursor.execute(query)
    for result in mycursor:
        return '%s %s' %(result[0], result[1])

def get_year_values(time):
    """return values for year mode"""
    mycursor = MY_DATABASE.cursor()
    query = ("SELECT  obis_180, DATE_FORMAT (datum_zeit, '%Y-%m-%d') FROM zaehlwerte WHERE YEAR (datum_zeit) = {0} AND DATE_FORMAT(datum_zeit, '%e') = '1' AND DATE_FORMAT(datum_zeit, '%T') = '00:01:00'").format(time)
    mycursor.execute(query)
    for result in mycursor:
        return '%s %s' %(result[0], result[1])

def get_custom_values(start_time, end_time):
    """return values for custom mode"""
    mycursor = MY_DATABASE.cursor()
    query = ("SELECT obis_180, DATE_FORMAT(datum_zeit, '%Y-%m-%d') FROM zaehlwerte WHERE DATE_FORMAT(datum_zeit, '%Y-%m-%d') BETWEEN {0} AND {1} AND DATE_FORMAT(datum_zeit, '%T') = '00:01:00'").format(start_time, end_time)
    mycursor.execute(query)
    for result in mycursor:
        return '%s %s' %(result[0], result[1])

@APP.route('/')
def get_data():
    """choose requested data and return to website"""
    mode = request.args['m']
    if mode == 'day':
        time = request.args['t']
        res = request.args['r']
        response = get_day_values(time, res)
    elif mode == 'month':
        month = request.args['my']
        year = request.args['y']
        response = get_month_values(year, month)
    elif mode == 'year':
        time = request.args['t']
        response = get_year_values(time)
    elif mode == 'custom':
        start_time = request.args['st']
        end_time = request.args['et']
        response = get_custom_values(start_time, end_time)
    else:
        return Response(status=404)

    return jsonify(response)


if __name__ == '__main__':
    import os
    HOST = os.environ.get('SERVER_HOST', 'localhost')
    try:
        PORT = int(os.environ.get('SERVER_PORT', '5555'))
    except ValueError:
        PORT = 5555
    APP.run(HOST, PORT)
