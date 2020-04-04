from flask import Blueprint, request, jsonify, session
from werkzeug.exceptions import abort

from itp.meterhandler import MeterHandler, get_meter_data

bp = Blueprint('api', __name__, url_prefix='/api')


@bp.route('/<mode>/<meter_id>')
def api(mode, meter_id):
    """Returns the meter data for a specific request as JSON."""
    session_id = session.get('session_id')

    # Check if data was already queried during the dashboard request
    if session_id is not None:
        mh = MeterHandler()
        meter_data, interpolation = mh.pop_session(session_id)
        if meter_data is None:  # No data was found
            meter_data, interpolation = get_meter_data(mode, request.args, meter_id)
    else:   # No data was stored
        meter_data, interpolation = get_meter_data(mode, request.args, meter_id)

    if meter_data is None:
        abort(400)

    if interpolation['necessary']:
        return jsonify(meter_data, interpolation['values'])
    else:
        return jsonify(meter_data)
