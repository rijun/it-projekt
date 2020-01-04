from datetime import datetime, timedelta
from math import floor
from statistics import mean

from flask import Blueprint, flash, g, redirect, render_template, request, url_for, jsonify
from werkzeug.exceptions import abort

from itp.db import get_db

bp = Blueprint('dashboard', __name__)

QUERY_DICT = {
    'day': "SELECT datum_zeit, obis_180 FROM zaehlwerte WHERE datum_zeit BETWEEN ? AND ? AND STRFTIME('%M', datum_zeit) % 15 = 0 AND zaehler_id = ? ORDER BY datum_zeit ",
    'interval': "SELECT DATE(datum_zeit), obis_180 FROM zaehlwerte WHERE DATE(datum_zeit) BETWEEN ? AND ? AND zaehler_id = ? AND TIME(datum_zeit) = '00:00:00' ORDER BY datum_zeit",
    'month': "SELECT DATE(datum_zeit), obis_180 FROM zaehlwerte WHERE DATE(datum_zeit) BETWEEN ? AND ? AND TIME(datum_zeit) = '00:00:00' AND zaehler_id = ? ORDER BY datum_zeit",
    'year':  "SELECT DATE(datum_zeit, '%Y-%m-%d'), obis_180 FROM zaehlwerte WHERE STRFTIME('%Y', datum_zeit) BETWEEN ? AND ? AND STRFTIME('%d', datum_zeit) = '01' AND TIME(datum_zeit) = '00:00:00' AND zaehler_id = ? ORDER BY datum_zeit"
}


@bp.route('/dashboard/<mode>/<meter_id>')
def dashboard(mode, meter_id):
    """Respond with dashboard page."""
    meter_data = get_meter_data(mode, request.args, meter_id)

    if meter_data is None:
        abort(400)  # Reply with bad request

    g.mode = mode
    g.meter_id = meter_id
    g.datetime = request.args['d']

    dashboard_data = get_dashboard_data(mode, request.args, meter_id, meter_data)

    g.data = meter_data
    return render_template('dashboard.html', **dashboard_data)


@bp.route('/meters/<mode>/<meter_id>')
def meter(mode, meter_id):
    meter_data = get_meter_data(mode, request.args, meter_id)
    times = []
    meter_readings = []
    energy_diffs = []

    for res in meter_data:
        times.append(res['datum_zeit'])
        meter_readings.append(float(res['obis_180']))

    for i in range(len(times) - 1):
        energy_diffs.append((floor(meter_readings[i + 1] * 100) - floor(meter_readings[i] * 100)) / 100)

    # Remove last entries as times and meter_readings are larger than energy_diffs
    times.pop()
    meter_readings.pop()

    # Create list of meter_id data tuples
    meter_data_list = []
    for i, time in enumerate(times):
        meter_data_list.append({'datetime': time, 'reading': meter_readings[i], 'diff': energy_diffs[i]})

    return jsonify(meter_data_list)


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


def get_dashboard_data(mode, args, meter_id, meter_data):
    times = []
    meter_readings = []
    energy_diffs = []

    for res in meter_data:
        times.append(res['datum_zeit'])
        meter_readings.append(float(res['obis_180']))

    for i in range(len(times) - 1):
        energy_diffs.append((floor(meter_readings[i + 1] * 100) - floor(meter_readings[i] * 100)) / 100)

    # Remove last entries as times and meter_readings are larger than energy_diffs
    times.pop()
    meter_readings.pop()

    # Create list of meter_id data tuples
    meter_data_list = []
    for i, time in enumerate(times):
        meter_data_list.append({'datetime': time, 'reading': meter_readings[i], 'diff': energy_diffs[i]})

    day = datetime.strptime(request.args['d'], "%Y-%m-%d")
    next_day = day + timedelta(days=1)
    prev_day = day - timedelta(days=1)
    unit = "kWh / 60 min"
    data_url = f"/meters/{mode}/{meter_id}?d={day}"
    next_url = f"/dashboard/{mode}/{meter_id}?d={next_day.strftime('%Y-%m-%d')}"
    prev_url = f"/dashboard/{mode}/{meter_id}?d={prev_day.strftime('%Y-%m-%d')}"
    response_dict = {
        'meter_id': meter_id,
        'min': min(energy_diffs),
        'max': max(energy_diffs),
        'avg': round(mean(energy_diffs), 3),
        'sum': round(sum(energy_diffs), 2),
        'datetime': day.strftime('%A, %d. %B %Y'),
        'unit': unit,
        'tbl_title': 'Uhrzeit',
        'data_url': data_url,
        'next_url': next_url,
        'prev_url': prev_url
    }
    return response_dict


def day_request(args):
    abort(404, f"{args}")


def interval_request(args):
    abort(404, f"{args}")


def month_request(args):
    abort(404, f"{args}")


def year_request(args):
    abort(404, f"{args}")


mode_function_dict = {
    'day': day_request,
    'interval': interval_request,
    'month': month_request,
    'year': year_request,
}
