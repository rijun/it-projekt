"""
Requirements: flask
For development: flask-cors
"""
# Required imports
from flask import Flask, request, jsonify
from flask_cors import CORS

# Not required import
import random
import datetime
from math import floor


# Flask website setup
app = Flask(__name__)
CORS(app)


# Define the API endpoint for "/data"
@app.route('/data')
def get_meter_data():
    # Assign GET parameters to variables
    selection = request.args['s']
    begin = request.args['b']
    end = request.args['e']
    resolution = request.args['r']

    # Get requested data
    response = cases[selection](begin, end, resolution)
    return jsonify(response)


def get_day_data(begin, end, resolution):
    try:
        size = int(24 * 60 / float(resolution))
        x_value = datetime.datetime(2000, 1, 1, 0, 0)
        response_x = []
        response_y = []

        for i in range(size):
            response_x.append(x_value.strftime('%H:%M'))
            x_value += datetime.timedelta(minutes=int(resolution))
            response_y.append(floor(random.uniform(0, 2) * 100)/100)

        response = {
            'x_values': response_x,
            'y_values': response_y
        }

        return response
    except:
        return {'error': "An error occurred"}


def get_week_data(begin, end=0, resolution=0):
    return {}


def get_custom_data(begin, end, resolution=0):
    first_day = datetime.datetime.strptime(begin, '%Y-%m-%d')
    last_day = datetime.datetime.strptime(end, '%Y-%m-%d')
    x_value = first_day
    response_x = []
    response_y = []

    try:
        while x_value <= last_day:
            response_x.append(x_value.strftime('%Y-%m-%d'))
            x_value += datetime.timedelta(days=1)
            response_y.append(floor(random.uniform(0, 14) * 100) / 100)

            response = {
                'x_values': response_x,
                'y_values': response_y
            }

        return response
    except:
        return {'error': "An error occurred"}


# Switch-function in Python
cases = {
    'day': get_day_data,
    'week': get_week_data,
    'custom': get_custom_data
}

if __name__ == '__main__':
    app.run(port='5000', debug=True)
