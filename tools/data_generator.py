from csv import QUOTE_NONE, reader, writer
from datetime import datetime, timedelta
from json import dumps, load
from math import cos, pi
from random import seed, triangular
from statistics import mean


def generate_template():
    """
    Generate a JSON file which maps every weekday and every quarter hour to a minimal, maximal and average load.
    This can later be used as a template for the load profile generation.

    :return: The load profile template
    :rtype: dict
    """

    print("\nReading CSV file... ")
    csv_data = read_csv_data()
    if not csv_data:
        print("\nInput error!")
        input("Press <Enter> to exit...")
        quit()

    print("\nBuilding template... ", end='')
    load_data = convert_energy(csv_data)
    week_dict = get_all_load_diffs(load_data)
    profile_dict = calculate_load_diffs_statistics(week_dict)
    print("Done!")

    print("Writing template file... ", end='')
    f = open("template.json", 'w')
    f.write(dumps(profile_dict))
    f.close()
    print("Done!")

    return profile_dict


def read_csv_data():
    """
    Reads a CSV file and returns a list of tuples. The tuples each contain the current datetime
    and respective meter reading, with an resolution of 15 minutes.

    :return: list of tuples (datetime, meter reading)
    :rtype: list
    """
    return_list = []

    filename = input("Name of CSV file (zaehlwerte.csv): ")
    if not filename:    # Default filename
        filename = "zaehlwerte.csv"

    try:
        with open(filename, mode='r') as csv_file:
            row_count = sum(1 for row in reader(csv_file))
            print("Number of rows in file: ", row_count)

            csv_file.seek(0)    # Reset csv_file index to 0
            csv_reader = reader(csv_file)

            # Go through each row in the .csv file and append a tuple containing the current date/time
            # and meter readings to the csv_data list --> (date/time, meter_readings)
            for index, row in enumerate(csv_reader):
                row_date = datetime.strptime(row[0], "%Y-%m-%d %H:%M:%S")

                # Only 15 minute values, as this resolution will suffice
                if row_date.minute % 15 == 0:
                    return_list.append((row_date, float(row[2])))

                    print("\rRows processed: {0} / {1}".format(index + 1, row_count), end='')

    finally:
        return return_list


def convert_energy(csv_data):
    """
    Convert the meter readings stored in csv_data to load differences (load diffs) by subtracting the current
    meter reading from the next meter reading.

    :param csv_data: List of tuples (datetime, meter reading)
    :type csv_data: list
    :return: List of tuples (datetime, load diffs)
    :rtype: list
    """
    load_data = []

    for i in range(len(csv_data) - 1):  # len(csv_data)-1 as a load can't be calculated for the last element
        current_data = csv_data[i][1]
        next_data = csv_data[i + 1][1]
        diff = round(next_data - current_data, 2)
        load_data.append((csv_data[i][0], diff))
    return load_data


def get_all_load_diffs(load_data):
    """
    Creates a dictionary which contains a list of all load differences sorted by the weekday and time.

    :param load_data: List of tuples (datetime, load diffs)
    :type load_data: list
    :return: List of all load diffs sorted by weekday and time
    :rtype: dict
    """
    weekday_dict = {}

    for data in load_data:
        current_weekday = data[0].weekday()

        # Add weekday if it is not already in weekday_dict
        if current_weekday not in weekday_dict:
            weekday_dict[current_weekday] = {}

        time_dict = weekday_dict[current_weekday]
        current_time = data[0].strftime("%H:%M")

        # Add weekday if it is not already in weekday_dict
        if current_time not in time_dict:
            time_dict[current_time] = []

        time_dict[current_time].append(data[1])

    return weekday_dict


def calculate_load_diffs_statistics(week_dict):
    """
    Creates a dictionary which contains the minimal, maximal and average load differences of a specific weekday
    and time. The return dictionary statistics_dict is sorted by weekday and time.

    :param week_dict: All load diffs sorted by weekday and time
    :type week_dict: dict
    :return: Min, max and average load diffs sorted by weekday and time
    :rtype: dict
    """
    statistics_dict = {}

    for key, value in week_dict.items():
        current_weekday = str(key)  # key has to be converted to str for JSON dump

        # Add weekday if it is not already in statistics_dict
        if current_weekday not in statistics_dict:
            statistics_dict[current_weekday] = {}

        weekday_dict = statistics_dict[current_weekday]
        load_diffs_list = value.keys()

        for time in load_diffs_list:
            # Add time if it is not already in load_diffs_list
            if time not in weekday_dict:
                weekday_dict[time] = ()

            min_load_diff = min(value[time])
            max_load_diff = max(value[time])
            avg_load_diff = mean(value[time])

            weekday_dict[time] = {
                "min": min_load_diff,
                "max": max_load_diff,
                "avg": avg_load_diff
            }

    return statistics_dict


def generate_load_profile(template=None):
    """
    Generate a JSON file which maps every weekday and every quarter hour to a minimal, maximal and average load.
    This can later be used as a template for the load profile generation.

    :param template: The load profile template
    :type template: dict
    """

    # Load JSON template if it is not passed as an argument
    if not template:
        filename = input("Name of JSON file (template.json): ")
        if not filename:    # Default filename
            filename = "template.json"

        print("Opening template file... ", end='')
        with open(filename, mode='r') as json_file:
            template = load(json_file)
        print("Done!")

    csv_entry_list = build_load_profile(template)

    print("Writing load profile... ", end='')
    with open("data.csv", mode='w', newline="\n", encoding="utf-8") as csv_file:
        csv_writer = writer(csv_file, delimiter=',', quotechar='"', quoting=QUOTE_NONE)
        for row in csv_entry_list:
            csv_writer.writerow(row)
        csv_file.close()

    print("Done!")
    input("Press <Enter> to exit...")


def build_load_profile(template):
    """
    Builds a list of tuples which contain the entries for the database according to following template:
    (current_date_and_time, meter_number, current_meter_reading(obis_180), current_load(obis_170)
    The current_load is always 0, but required for the database.

    :param template: The load profile template
    :type template: dict
    :return: List of tuples containing the date/time, meter number, current meter reading and current load (always 0)
    :rtype: list
    """

    start, end, meter_number, meter_start_val = get_user_parameters()

    print("Building load profile... ", end='')

    load_profile = []
    start_date = datetime.strptime(start, "%Y-%m-%d")
    end_date = datetime.strptime(end, "%Y-%m-%d")
    current_datetime = start_date
    current_meter_val = 0

    while current_datetime <= end_date:
        seed()  # Initialize random generator
        month_factor = calculate_month_factor(current_datetime.month)

        if current_datetime == start_date:
            current_meter_val = meter_start_val * month_factor
            load_profile_entry = (current_datetime, meter_number, round(current_meter_val, 2), 0)
        else:
            current_weekday = str(current_datetime.weekday())   # current_weekday must be str for the dict keys
            current_time = current_datetime.time().strftime("%H:%M")
            current_statistics = template[current_weekday][current_time]    # Get min, max and average values

            # Calculate the current load difference with a triangular distribution
            current_load_diff = triangular(
                low=current_statistics["min"],
                high=current_statistics["max"],
                mode=current_statistics["avg"]
            )

            current_meter_val += current_load_diff * month_factor

            load_profile_entry = (current_datetime, meter_number, round(current_meter_val, 2), 0)

        load_profile.append(load_profile_entry)
        current_datetime += timedelta(minutes=15)

    print("Done!")

    return load_profile


def get_user_parameters():
    """
    Gets the required parameters from the user for building the database entries.

    :return: Start date, end date, meter number, first meter value
    :rtype: int
    """
    start = input("Start date in YYYY-MM-DD format (2018-01-01): ")
    if not start:   # Default start date
        start = "2018-01-01"

    end = input("End date in YYYY-MM-DD format (2019-01-01): ")
    if not end:     # Default end date
        end = "2019-01-01"

    meter_number = input("Meter number (1ESY1312000000): ")
    if not meter_number:    # Default meter number
        meter_number = "1ESY1312000000"

    start_val_input = input("Start value (1000): ")
    if not start_val_input:     # Default first meter value
        start_val_input = 1000.0
    meter_start_val = float(start_val_input)

    return start, end, meter_number, meter_start_val

def calculate_month_factor(month):
	return 0.25 * cos(2 * pi / 12 * (month - 0.5)) + 1.50

def menu():
    """
    Shows a menu in which the user can select the current mode of operation.

    :return: The selected option
    :rtype: int
    """
    print("## Meter Readings Generation Tool ##\n")
    print("Select an option:\n")
    print("(1)\t\t-->\t\tGenerate template and database file (default)")
    print("(2)\t\t-->\t\tGenerate template")
    print("(3)\t\t-->\t\tGenerate database file\n")

    selection = input(">>> ")

    if not selection:   # Default selection
        return 1

    else:
        # Check if input is an integer
        try:
            return int(selection)
        # Return error code
        except ValueError:
            print("Input error!")
            input("Press <Enter> to exit...")
            quit(-1)


if __name__ == "__main__":
    user_selection = menu()

    if user_selection == 1:
        data_template = generate_template()
        generate_load_profile(template=data_template)
        print("Success!")
    elif user_selection == 2:
        generate_template()
        print("Success!")
    elif user_selection == 3:
        generate_load_profile()
        print("Success!")
