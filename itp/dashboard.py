from datetime import datetime, timedelta
from math import floor
from statistics import mean
import uuid

from flask import Blueprint, flash, g, redirect, render_template, request, url_for, jsonify, session
from werkzeug.exceptions import abort

from itp.db import get_db
from itp.meterhandler import MeterHandler, get_meter_data

bp = Blueprint('dashboard', __name__, url_prefix='/dashboard')


@bp.route('/<mode>/<meter_id>')
def dashboard(mode, meter_id):
    """Respond with dashboard page."""
    meter_data, energy_diffs = get_meter_data(mode, request.args, meter_id, diffs=True)

    if meter_data is None:
        abort(400)  # Reply with bad request

    session_id = uuid.uuid4().hex
    mh = MeterHandler()
    mh.push_session(session_id, meter_data)

    # Add cookie with session id
    session.clear()
    session['session_id'] = session_id

    g.mode = mode
    g.meter_id = meter_id
    g.datetime = request.args['d']

    dashboard_data = get_dashboard_data(mode, request.args, meter_id, energy_diffs)

    g.dashboard = True
    return render_template('dashboard.html', **dashboard_data)


def get_dashboard_data(mode, args, meter_id, energy_diffs):

    day = datetime.strptime(request.args['d'], "%Y-%m-%d")
    next_day = day + timedelta(days=1)
    prev_day = day - timedelta(days=1)
    unit = "kWh / 60 min"
    data_url = f"/meters/{mode}/{meter_id}?d={day}"
    next_url = f"/dashboard/{mode}/{meter_id}?d={next_day.strftime('%Y-%m-%d')}"
    prev_url = f"/dashboard/{mode}/{meter_id}?d={prev_day.strftime('%Y-%m-%d')}"
    response_dict = {
        'meter_id': meter_id,
        'mode': mode,
        'min': min(energy_diffs),
        'max': max(energy_diffs),
        'avg': round(mean(energy_diffs), 3),
        'sum': round(sum(energy_diffs), 2),
        'datetime': day.strftime('%Y-%m-%d'),
        'datetime_str': day.strftime('%A, %d. %B %Y'),
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
