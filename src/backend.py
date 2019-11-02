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
import sqlite3

from flask import Flask, render_template

app = Flask(__name__)  # Create Flask application

@app.route('/')
def root():
    """
    This function returns the website which serves as the frontend for this application.

    :return: Website index.html
    :rtype: HTML file
    """

    return render_template('index.html')




# Run Flask server with the selected settings
if __name__ == '__main__':
    app.run(host='0.0.0.0', port='5000', debug=True)   # Visible in network
    # app.run(port='5000', debug=True)    # Not visible in network, only on localhost
