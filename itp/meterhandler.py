from datetime import datetime, timedelta

from dateutil.relativedelta import relativedelta

from itp.db import get_db

__add_dict = {
    'day': timedelta(minutes=15),
    'interval': timedelta(days=1),
    'month': timedelta(days=1),
    'year': relativedelta(months=1)
}


class MeterHandler:
    __meter_sessions = {}

    def __init__(self):
        pass

    def push_session(self, session_id, data, interpolation):
        """Adds the meter data from a request to the session storage."""
        self.__meter_sessions[session_id] = (data, interpolation)

    def pop_session(self, session_id):
        """Returns the meter data from the session storage and removes it."""
        data, interpolation = self.__meter_sessions.pop(session_id, None)
        return data, interpolation


def get_meter_data(mode, args, meter_id, diffs=False):
    """Return the stored meter data as a list."""
    db = get_db()

    stored_meters = [meter['zaehler_id'] for meter in db.execute("SELECT * FROM zaehlpunkte").fetchall()]
    if meter_id not in stored_meters:
        return None, None, None

    QUERY_DICT = {
        'day': "SELECT datum_zeit, obis_180 FROM zaehlwerte WHERE datum_zeit BETWEEN ? AND ? AND STRFTIME('%M', "
               "datum_zeit) % 15 = 0 AND zaehler_id = ? ORDER BY datum_zeit",
        'int_month': "SELECT datum_zeit, obis_180 FROM zaehlwerte WHERE datum_zeit BETWEEN ? AND ? AND "
                     "TIME(datum_zeit) = '00:00:00' AND zaehler_id = ? ORDER BY datum_zeit",
        'year': "SELECT datum_zeit, obis_180 FROM zaehlwerte WHERE datum_zeit BETWEEN ? AND ? AND "
                "STRFTIME('%d', datum_zeit) = '01' AND TIME(datum_zeit) = '00:00:00' AND zaehler_id = ? ORDER BY "
                "datum_zeit "
    }

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
        raise ValueError

    if not result:
        return None, None, None

    energy_diffs, meter_data_list, interpolation = __parse_db_result(result, mode)

    if diffs:
        return meter_data_list, energy_diffs, interpolation
    else:
        return meter_data_list, interpolation


def __parse_db_result(db_result, query_mode):
    # Initialize variables for storing the data
    times = []
    meter_readings = []
    energy_diffs = []
    interpolation = {
        'necessary': False,  # Assume no missing data
        'values': []
    }
    next_expected_datetime = __str2dt(db_result[0]['datum_zeit']) + __add_dict[query_mode]  # Set first expected date

    for i in range(len(db_result) - 1):
        times.append(db_result[i]['datum_zeit'])
        meter_readings.append(db_result[i]['obis_180'])

        next_datetime_entry = __str2dt(db_result[i + 1]['datum_zeit'])
        next_meter_reading_entry = db_result[i + 1]['obis_180']

        if next_datetime_entry != next_expected_datetime:   # Found missing data if true
            interpolation['necessary'] = True
            # Gather required data for interpolation
            last_datetime_entry = __str2dt(db_result[i]['datum_zeit'])
            last_meter_reading_entry = db_result[i]['obis_180']

            gen_datetimes = __generate_missing_datetimes(last_datetime_entry, next_datetime_entry, query_mode)
            gen_meter_readings = __generate_missing_meter_readings(last_meter_reading_entry, next_meter_reading_entry,
                                                                   len(gen_datetimes))
            gen_energy_diffs = __generate_missing_energy_diffs(gen_meter_readings, next_meter_reading_entry)
            # Add generated data to the lists
            times.extend(gen_datetimes[:-1])
            meter_readings.extend(gen_meter_readings[:-1])

            for j in range(len(gen_datetimes)):
                energy_diffs.append(0)
                interpolation['values'].append({'datetime': gen_datetimes[j], 'diff': gen_energy_diffs[j]})

            next_expected_datetime = next_datetime_entry + __add_dict[query_mode]
        else:
            diff = next_meter_reading_entry - meter_readings[-1]
            energy_diffs.append(round(diff, 2))  # Round necessary to mitigate floating point error
            interpolation['values'].append({'datetime': times[-1], 'diff': 0})  # Use zero as value if data is valid
            next_expected_datetime += __add_dict[query_mode]

    # Create list of meter_id data tuples
    meter_data_list = []
    for i, time in enumerate(times):
        meter_data_list.append({'datetime': time, 'reading': meter_readings[i], 'diff': energy_diffs[i]})

    return energy_diffs, meter_data_list, interpolation


def __generate_missing_datetimes(start, end, query_mode):
    """Return a list of datetimes between the start and end values."""
    next_date = start + __add_dict[query_mode]
    date_list = []
    # Populate date_list with the missing dates
    while next_date <= end:
        date_list.append(next_date.strftime("%Y-%m-%d %H:%M:%S"))
        next_date += __add_dict[query_mode]
    return date_list


def __generate_missing_meter_readings(start, end, amount):
    """Return a list of meter readings between the start and end values and a specified length."""
    meter_reading_delta = round((end - start) / (amount + 1), 2)
    meter_readings_list = []
    # Populate meter_readings_list with interpolated data
    for i in range(amount):
        meter_readings_list.append(start + (i + 1) * meter_reading_delta)
    return meter_readings_list


def __generate_missing_energy_diffs(meter_reading_list, next_reading):
    """Return a list of energy differences."""
    energy_diff_list = []
    # Populate energy_diff_list with interpolated data
    for i in range(len(meter_reading_list) - 1):
        diff = meter_reading_list[i + 1] - meter_reading_list[i]
        energy_diff_list.append(round(diff, 2))
    # Add last value manually
    diff = next_reading - meter_reading_list[-1]
    energy_diff_list.append(round(diff, 2))
    return energy_diff_list


def __str2dt(string):
    return datetime.strptime(string, "%Y-%m-%d %H:%M:%S")
