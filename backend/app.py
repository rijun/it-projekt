"""
This script runs the application using a development server.
It contains the definition of routes and views for the application.
"""

import simplejson as json
import pymysql
from flask import Flask, request, jsonify, make_response
app = Flask(__name__)

# Make the WSGI interface available at the top level so wfastcgi can get it.
wsgi_app = app.wsgi_app

my_Database = pymysql.connect(
    host="127.0.0.1",
    user="root",
    passwd="root",
    database= "itp2",
    )

date = []
energy =[]
diff =[]

def get_day_values (time, res):
    mycursor = my_Database.cursor()
    query = ("SELECT datum_zeit, obis_180 FROM zaehlwerte WHERE (DATE_FORMAT (datum_zeit, '%Y-%m-%d')) = '{0}' AND MINUTE (datum_zeit) % {1} = 0 ").format(time, res )
    mycursor.execute (query)
    for result in mycursor:          
         date.append(result[0])
         energy.append(result[1])
    for i in range(0, len(energy) - 1):
        diff.append(energy[i+1] - energy[i]) 
    data = [date, energy, diff]
    return(data)

def get_month_values (year, month):
    mycursor = my_Database.cursor()
    query = ("SELECT DATE_FORMAT(datum_zeit, '%Y-%m-%d'), obis_180 FROM zaehlwerte WHERE YEAR (datum_zeit) = '{0}' AND MONTH (datum_zeit) = '{1}' AND DATE_FORMAT(datum_zeit, '%T') = '00:01:00'").format(year, month )
    mycursor.execute (query)
    for result in mycursor:  
         date.append(result[0])
         energy.append(result[1])
    for i in range(0, len(energy) - 1):
        diff.append(energy[i+1] - energy[i]) 
    data = [date, energy, diff] 
    return(data)

def get_year_values (time):
    mycursor = my_Database.cursor()
    query = ("SELECT  DATE_FORMAT (datum_zeit, '%Y-%m-%d'), obis_180 FROM zaehlwerte WHERE YEAR (datum_zeit) = '{0}' AND DATE_FORMAT(datum_zeit, '%e') = 1 AND DATE_FORMAT(datum_zeit, '%T') = '00:01:00'").format(time)
    mycursor.execute (query)
    for result in mycursor:          
         date.append(result[0])
         energy.append(result[1])  
    for i in range(0, len(energy) - 1):
        diff.append(energy[i+1] - energy[i]) 
    data = [date, energy, diff]
    return(data)

def get_custom_values (start_time, end_time):
    mycursor =my_Database.cursor()
    query = ("SELECT DATE_FORMAT(datum_zeit, '%Y-%m-%d'), obis_180 FROM zaehlwerte WHERE DATE_FORMAT(datum_zeit, '%Y-%m-%d') BETWEEN '{0}' AND '{1}' AND DATE_FORMAT(datum_zeit, '%T') = '00:01:00'").format(start_time, end_time)
    mycursor.execute (query)
    for result in mycursor:          
         date.append(result[0])
         energy.append(result[1])  
    for i in range(0, len(energy) - 1):
        diff.append(energy[i+1] - energy[i]) 
    data = [date, energy, diff]
    return(data)

@app.route('/')
def get_data():
    mode = request.args['m']
    if mode == 'day':
        time = request.args['t']
        res = request.args['r']
        response = (get_day_values(time, res))
    elif mode == 'month':
        month = request.args['my']
        year = request.args['y']
        response = get_month_values(year, month)
    elif mode == 'year':
        time = request.args['t']
        response = get_year_values(time)
    elif mode =='custom':
        start_time = request.args['st']
        end_time = request.args['et']
        response = get_custom_values(start_time, end_time)
    else:
        #return make_response(('not_found.html'),404)
        #def http_404_handler():
            return make_response("<h2>404 Error</h2>", 400)
    return jsonify (response)

if __name__ == '__main__':
    import os
    HOST = os.environ.get('SERVER_HOST', 'localhost')
    try:
        PORT = int(os.environ.get('SERVER_PORT', '5555'))
    except ValueError:
        PORT = 5555
    app.run(HOST, PORT)
