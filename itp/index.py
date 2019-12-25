import sqlite3
from datetime import datetime, timedelta

from flask import Blueprint, flash, g, redirect, render_template, request, session, url_for

from itp.db import get_db

bp = Blueprint('index', __name__)


@bp.route('/')
def index():
    """
    This function returns the website which serves as the frontend for this application.

    :return: Website index.html
    :rtype: HTML file
    """

    meter_list = []
    db = get_db()
    error = None

    stored_meters = db.execute("SELECT * FROM zaehlpunkte").fetchall()

    if not stored_meters:
        error = "Fehler! Es sind keine Einträge in der Datenbank vorhanden."

    if error is None:
        for meter in stored_meters:
            meter_min = db.execute("SELECT MIN(datum_zeit) FROM zaehlwerte WHERE zaehler_id = ?",
                                   [meter['zaehler_id']]).fetchone()[0]
            meter_max = db.execute("SELECT MAX(datum_zeit) FROM zaehlwerte WHERE zaehler_id = ?",
                                   [meter['zaehler_id']]).fetchone()[0]

            meter_list.append({
                'id': meter['zaehler_id'],
                'lastname': meter['kunde_name'],
                'firstname': meter['kunde_vorname'],
                'zipcode': meter['plz'],
                'city': meter['ort'],
                'min': datetime.strptime(meter_min, '%Y-%m-%d %H:%M:%S').strftime('%Y-%m-%d'),
                'max': (datetime.strptime(meter_max, '%Y-%m-%d %H:%M:%S') - timedelta(days=1)).strftime('%Y-%m-%d')
            })
    else:
        flash(error)

    return render_template('index.html', meters=meter_list)
