from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from math import floor
from statistics import mean

from flask import Blueprint, flash, g, redirect, render_template, request, url_for, jsonify
from werkzeug.exceptions import abort

from itp.db import get_db


class MeterHandler:
    __meter_sessions = {}

    def __init__(self):
        pass

    def push_session(self, session_id, data):
        """Adds the meter data from a request to the session storage."""
        self.__meter_sessions[session_id] = data

    def pop_session(self, session_id):
        """Returns the meter data from the session storage and removes it."""
        data = self.__meter_sessions.pop(session_id, None)
        return data


# TODO: Add unit test
def get_meter_data(mode, args, meter_id, diffs=False):
    """Return the stored meter data as a list."""
    db = get_db()

    stored_meters = [meter['zaehler_id'] for meter in db.execute("SELECT * FROM zaehlpunkte").fetchall()]
    if meter_id not in stored_meters:
        return None

    QUERY_DICT = {
        'day': "SELECT datum_zeit, obis_180 FROM zaehlwerte WHERE datum_zeit BETWEEN ? AND ? AND STRFTIME('%M', "
               "datum_zeit) % 15 = 0 AND zaehler_id = ? ORDER BY datum_zeit",
        'int_month': "SELECT datum_zeit, obis_180 FROM zaehlwerte WHERE datum_zeit BETWEEN ? AND ? AND "
                     "TIME(datum_zeit) = '00:00:00' AND zaehler_id = ? ORDER BY datum_zeit",
        'year': "SELECT datum_zeit, obis_180 FROM zaehlwerte WHERE datum_zeit BETWEEN ? AND ? AND "
                "STRFTIME('%d', datum_zeit) = '01' AND TIME(datum_zeit) = '00:00:00' AND zaehler_id = ? ORDER BY "
                "datum_zeit "
    }

    try:
        if mode == 'day':
            day = datetime.strptime(args['d'], "%Y-%m-%d")
            next_day = day + timedelta(days=1)
            result = db.execute(QUERY_DICT['day'], (day, next_day, meter_id)).fetchall()
        elif mode == 'interval':
            start = datetime.strptime(args['s'], "%Y-%m-%d")
            end = datetime.strptime(args['e'], "%Y-%m-%d") + timedelta(days=1)
            result = db.execute(QUERY_DICT['int_month'], (start, end, meter_id)).fetchall()
        elif mode == 'month':
            month = datetime.strptime(args['m'], "%Y-%m")
            next_month = month + relativedelta(months=1)
            result = db.execute(QUERY_DICT['int_month'], (month, next_month, meter_id)).fetchall()
        elif mode == 'year':
            year = datetime.strptime(args['y'], "%Y")
            next_year = year + relativedelta(years=1)
            result = db.execute(QUERY_DICT['year'], (year, next_year, meter_id)).fetchall()
        else:
            return None
    except KeyError:
        return None

    energy_diffs, meter_data_list = __parse_db_result(result)

    if diffs:
        return meter_data_list, energy_diffs
    else:
        return meter_data_list


def __parse_db_result(db_result):
    times = []
    meter_readings = []
    energy_diffs = []
    for res in db_result:
        times.append(res['datum_zeit'])
        meter_readings.append(float(res['obis_180']))
    for i in range(len(times) - 1):
        energy_diffs.append((floor(meter_readings[i + 1] * 100) - floor(meter_readings[i] * 100)) / 100)
    # Remove last entries from times and meter_readings as they are only required for the energy_diffs calculation
    times.pop()
    meter_readings.pop()
    # Create list of meter_id data tuples
    meter_data_list = []
    for i, time in enumerate(times):
        meter_data_list.append({'datetime': time, 'reading': meter_readings[i], 'diff': energy_diffs[i]})
    return energy_diffs, meter_data_list
