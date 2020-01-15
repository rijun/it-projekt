from datetime import datetime, timedelta
from math import floor
from statistics import mean

from flask import Blueprint, flash, g, redirect, render_template, request, url_for, jsonify
from werkzeug.exceptions import abort

from itp.db import get_db

import meter

bp = Blueprint('api', __name__, url_prefix='/api')


@bp.route('/<mode>/<meter_id>')
def api(mode, meter_id):
    meter_data = meter.get_meter_data(mode, request.args, meter_id)
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
