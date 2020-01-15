from datetime import datetime, timedelta
from math import floor
from statistics import mean

from flask import Blueprint, flash, g, redirect, render_template, request, url_for, jsonify
from werkzeug.exceptions import abort

from itp.db import get_db

QUERY_DICT = {
    'day': "SELECT datum_zeit, obis_180 FROM zaehlwerte WHERE datum_zeit BETWEEN ? AND ? AND STRFTIME('%M', datum_zeit) % 15 = 0 AND zaehler_id = ? ORDER BY datum_zeit ",
    'interval': "SELECT DATE(datum_zeit), obis_180 FROM zaehlwerte WHERE DATE(datum_zeit) BETWEEN ? AND ? AND zaehler_id = ? AND TIME(datum_zeit) = '00:00:00' ORDER BY datum_zeit",
    'month': "SELECT DATE(datum_zeit), obis_180 FROM zaehlwerte WHERE DATE(datum_zeit) BETWEEN ? AND ? AND TIME(datum_zeit) = '00:00:00' AND zaehler_id = ? ORDER BY datum_zeit",
    'year':  "SELECT DATE(datum_zeit, '%Y-%m-%d'), obis_180 FROM zaehlwerte WHERE STRFTIME('%Y', datum_zeit) BETWEEN ? AND ? AND STRFTIME('%d', datum_zeit) = '01' AND TIME(datum_zeit) = '00:00:00' AND zaehler_id = ? ORDER BY datum_zeit"
}


def get_meter_data(mode, args, meter_id):
    """Return the stored meter data as a list."""
    db = get_db()

    stored_meters = [meter['zaehler_id'] for meter in db.execute("SELECT * FROM zaehlpunkte").fetchall()]
    if meter_id not in stored_meters:
        return None

    try:
        if mode == 'day':
            day = datetime.strptime(request.args['d'], "%Y-%m-%d")
            next_day = day + timedelta(days=1)
            result = db.execute(QUERY_DICT[mode], (day, next_day, meter_id)).fetchall()
        elif mode == 'interval':
            result = db.execute(QUERY_DICT[mode], (args['s'], args['e']))
        elif mode == 'month':
            result = db.execute(QUERY_DICT[mode], args['m'])
        elif mode == 'year':
            result = db.execute(QUERY_DICT[mode], args['y'])
        else:
            return None
    except KeyError:
        return None

    return result