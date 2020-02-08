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

    def push_session(self, session_id, data):
        """Adds the meter data from a request to the session storage."""
        self.__meter_sessions[session_id] = data

    def pop_session(self, session_id):
        """Returns the meter data from the session storage and removes it."""
        data = self.__meter_sessions.pop(session_id, None)
        return data


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
    except ValueError:
        return None

    if not result:
        return None

    energy_diffs, meter_data_list = __parse_db_result(result, mode)

    if diffs:
        return meter_data_list, energy_diffs
    else:
        return meter_data_list


def __parse_db_result(db_result, query_mode):
    times = []
    meter_readings = []
    energy_diffs = []

    next_expected_datetime = __str2dt(db_result[0]['datum_zeit']) + __add_dict[query_mode]

    for i, res in enumerate(db_result):
        times.append(res['datum_zeit'])
        meter_readings.append(res['obis_180'])

        if i >= len(db_result) - 1:
            break

        next_datetime_entry = __str2dt(db_result[i+1]['datum_zeit'])

        if next_datetime_entry != next_expected_datetime:   # Found missing data
            last_entry = (__str2dt(res['datum_zeit']), res['obis_180'])
            next_entry = (next_datetime_entry, db_result[i+1]['obis_180'])
            generated_times, generated_meter_readings = __generate_missing_data(last_entry, next_entry, query_mode)
            times.extend(generated_times)
            meter_readings.extend(generated_meter_readings)
            next_expected_datetime = next_datetime_entry + __add_dict[query_mode]
        else:
            next_expected_datetime += __add_dict[query_mode]

    for i in range(len(times) - 1):
        diff = meter_readings[i + 1] - meter_readings[i]
        energy_diffs.append(round(diff, 2))  # Round necessary to mitigate floating point error

    # Remove last entries from times and meter_readings as they are only required for the energy_diffs calculation
    times.pop()
    meter_readings.pop()
    # Create list of meter_id data tuples
    meter_data_list = []
    for i, time in enumerate(times):
        meter_data_list.append({'datetime': time, 'reading': meter_readings[i], 'diff': energy_diffs[i]})
    return energy_diffs, meter_data_list


def __generate_missing_data(start, end, query_mode):
    next_date = start[0] + __add_dict[query_mode]
    date_list = []
    # Populate date_list with the missing dates
    while next_date != end[0]:
        date_list.append(next_date.strftime("%Y-%m-%d %H:%M:%S"))
        next_date += __add_dict[query_mode]
    meter_reading_delta = round((end[1] - start[1]) / (len(date_list) + 1), 2)
    meter_readings_list = []
    # Populate meter_readings_list with interpolated data
    for i in range(len(date_list)):
        meter_readings_list.append(start[1] + (i+1) * meter_reading_delta)
        print(i)
    return date_list, meter_readings_list


def __str2dt(string):
    return datetime.strptime(string, "%Y-%m-%d %H:%M:%S")
