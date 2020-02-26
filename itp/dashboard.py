from datetime import datetime, timedelta
from math import floor
from statistics import mean
import uuid

from dateutil.relativedelta import relativedelta
from flask import Blueprint, flash, g, redirect, render_template, request, url_for, jsonify, session
from werkzeug.exceptions import abort

from itp.db import get_db
from itp.meterhandler import MeterHandler, get_meter_data

bp = Blueprint('dashboard', __name__, url_prefix='/dashboard')


@bp.route('/<mode>/<meter_id>')
def dashboard(mode, meter_id):
    """Respond with dashboard page."""
    try:
        meter_data, energy_diffs, interpolation = get_meter_data(mode, request.args, meter_id, diffs=True)
    except (ValueError, TypeError):
        flash("Fehler in der Abfrage!")
        return redirect(url_for('index'))

    if not meter_data:  # No results for sql query
        flash("Keine Daten zu dieser Abfrage gefunden.")
        return redirect(url_for('index'))

    session_id = uuid.uuid4().hex
    mh = MeterHandler()
    mh.push_session(session_id, meter_data, interpolation)

    # Add cookie with session id
    session.clear()
    session['session_id'] = session_id

    g.mode = mode
    g.meter_id = meter_id

    dashboard_data = get_dashboard_data(mode, request.args, meter_id, energy_diffs)

    g.dashboard = True

    return render_template('dashboard.html', **dashboard_data)


def get_dashboard_data(mode, args, meter_id, energy_diffs):
    """Gather and calculate the required data for display on the dashboard."""
    return mode_function_dict[mode](args, meter_id, energy_diffs)


def day_request(args, meter_id, energy_diffs):
    day = datetime.strptime(args['d'], "%Y-%m-%d")
    params = f"d={day}"
    next_day = day + timedelta(days=1)
    prev_day = day - timedelta(days=1)
    unit = "kWh / 60 min"
    data_url = f"/meters/interval/{meter_id}?{params}"
    next_url = f"/dashboard/day/{meter_id}?d={next_day.strftime('%Y-%m-%d')}"
    prev_url = f"/dashboard/day/{meter_id}?d={prev_day.strftime('%Y-%m-%d')}"
    response_dict = {
        'meter_id': meter_id,
        'mode': 'day',
        'min': min(energy_diffs),
        'max': max(energy_diffs),
        'avg': round(mean(energy_diffs), 3),
        'sum': round(sum(energy_diffs), 2),
        'params': params,
        'title': day.strftime('%A, %d. %B %Y'),
        'unit': unit,
        'tbl_title': 'Uhrzeit',
        'data_url': data_url,
        'next_url': next_url,
        'prev_url': prev_url
    }
    return response_dict


def interval_request(args, meter_id, energy_diffs):
    start = datetime.strptime(args['s'], '%Y-%m-%d')
    end = datetime.strptime(args['e'], '%Y-%m-%d')
    params = f"s={start}&e={end}"
    unit = "kWh / Tag"
    data_url = f"/meters/interval/{meter_id}?{params}"
    response_dict = {
        'meter_id': meter_id,
        'mode': 'interval',
        'min': min(energy_diffs),
        'max': max(energy_diffs),
        'avg': round(mean(energy_diffs), 3),
        'sum': round(sum(energy_diffs), 2),
        'params': params,
        'title': f"{start.strftime('%d.%m.%Y')} - {end.strftime('%d.%m.%Y')}",
        'unit': unit,
        'tbl_title': 'Datum',
        'data_url': data_url,
    }
    return response_dict


def month_request(args, meter_id, energy_diffs):
    month = datetime.strptime(args['m'], "%Y-%m")
    params = f"m={month}"
    next_month = month + relativedelta(months=1)
    prev_month = month - relativedelta(months=1)
    unit = "kWh / Tag"
    data_url = f"/meters/interval/{meter_id}?{params}"
    next_url = f"/dashboard/month/{meter_id}?m={next_month.strftime('%Y-%m')}"
    prev_url = f"/dashboard/month/{meter_id}?m={prev_month.strftime('%Y-%m')}"
    response_dict = {
        'meter_id': meter_id,
        'mode': 'month',
        'min': min(energy_diffs),
        'max': max(energy_diffs),
        'avg': round(mean(energy_diffs), 3),
        'sum': round(sum(energy_diffs), 2),
        'params': params,
        'title': month.strftime('%B %Y'),
        'unit': unit,
        'tbl_title': 'Datum',
        'data_url': data_url,
        'next_url': next_url,
        'prev_url': prev_url
    }
    return response_dict


def year_request(args, meter_id, energy_diffs):
    year = datetime.strptime(args['y'], "%Y")
    params = f"y={year}"
    unit = "kWh / Monat"
    data_url = f"/meters/year/{meter_id}?{params}"
    response_dict = {
        'meter_id': meter_id,
        'mode': 'year',
        'min': min(energy_diffs),
        'max': max(energy_diffs),
        'avg': round(mean(energy_diffs), 3),
        'sum': round(sum(energy_diffs), 2),
        'params': params,
        'title': year.strftime('%Y'),
        'unit': unit,
        'tbl_title': 'Monat',
        'data_url': data_url
    }
    return response_dict


mode_function_dict = {
    'day': day_request,
    'interval': interval_request,
    'month': month_request,
    'year': year_request,
}
