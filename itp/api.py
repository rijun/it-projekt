from datetime import datetime, timedelta
from math import floor
from statistics import mean

from flask import Blueprint, flash, g, redirect, render_template, request, url_for, jsonify, session
from werkzeug.exceptions import abort

from itp.db import get_db

from itp.meterhandler import MeterHandler, get_meter_data

bp = Blueprint('api', __name__, url_prefix='/api')


@bp.route('/<mode>/<meter_id>')
def api(mode, meter_id):
    session_id = session.get('session_id')

    if session_id is not None:
        mh = MeterHandler()
        meter_data = mh.pop_session(session_id)
        if meter_data is None:
            meter_data = get_meter_data(mode, request.args, meter_id)
    else:
        meter_data = get_meter_data(mode, request.args, meter_id)

    return jsonify(meter_data)
