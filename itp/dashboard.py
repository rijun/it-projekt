from flask import Blueprint, flash, g, redirect, render_template, request, url_for
from werkzeug.exceptions import abort

from itp.db import get_db

bp = Blueprint('dashboard', __name__)


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


@bp.route('/dashboard')
def meters():
    res = (None, None)  # First element is the meter information, second is the meter data
    mode = request.args['mode']

    if not mode:
        abort(400)

    mode_function_dict[mode](request.args)

    g.data = res[0]
    return render_template('dashboard/meter.html', **res[1])


