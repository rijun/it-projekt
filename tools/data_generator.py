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

    :rtype: dict
    :return: The load profile template
    """

    print("\nReading CSV file... ")
    csv_data = read_csv_data()
    if not csv_data:
        print("\nInput error!")
        input("Press <Enter> to exit...")
        quit()

    print("\nBuilding template... ", end='')
    load_data = convert_energy(csv_data)
    week_dict = build_week_dict(load_data)
    data_dict = build_data_dict(week_dict)
    print("Done!")

    print("Writing template file... ", end='')
    f = open("template.json", 'w')
    f.write(dumps(data_dict))
    f.close()
    print("Done!")

    return data_dict


def read_csv_data():
    return_list = []

    # Get csv filename
    filename = input("Name of CSV file (zaehlwerte.csv): ")
    if not filename:
        filename = "zaehlwerte.csv"

    try:
        with open(filename, mode='r') as csv_file:
            row_count = sum(1 for row in reader(csv_file))
            print("Number of rows in file: ", row_count)

            csv_file.seek(0)
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
    load_data = []
    # Convert energy to load
    for i in range(len(csv_data) - 1):  # len(csv_data)-1 as a load can't be calculated for the last element
        current_data = csv_data[i][1]
        next_data = csv_data[i + 1][1]
        diff = round(next_data - current_data, 2)
        load_data.append((csv_data[i][0], diff))
    return load_data


def build_week_dict(load_data):
    week_dict = {}
    # Build week dictionary
    for data in load_data:
        current_weekday = data[0].weekday()
        if current_weekday not in week_dict:
            week_dict[current_weekday] = {}
        weekday_dict = week_dict[current_weekday]
        current_time = data[0].strftime("%H:%M")
        if current_time not in weekday_dict:
            weekday_dict[current_time] = []
        weekday_dict[current_time].append(data[1])
    return week_dict


def build_data_dict(week_dict):
    data_dict = {}
    # Build data dictionary
    for key, value in week_dict.items():
        current_weekday = key
        if current_weekday not in data_dict:
            data_dict[current_weekday] = {}
        weekday_dict = data_dict[current_weekday]
        time_list = value.keys()
        for time in time_list:
            if time not in weekday_dict:
                weekday_dict[time] = ()
            min_load = min(value[time])
            max_load = max(value[time])
            avg_load = mean(value[time])
            weekday_dict[time] = (min_load, max_load, avg_load)
    return data_dict


def generate_load_profile(template=None):

    # Load JSON template if it is not passed as an argument
    if not template:
        filename = input("Name of JSON file (template.json): ")
        if not filename:
            filename = "template.json"
        print("Opening template file... ", end='')
        with open(filename, mode='r') as json_file:
            template = load(json_file)
        print("Done!")

    csv_entry_list = build_load_profile(template)

    print("Writing load profile... ", end='')
    with open("data.csv", mode='w') as csv_file:
        csv_writer = writer(csv_file, delimiter=',', quotechar='"', quoting=QUOTE_NONE)
        for row in csv_entry_list:
            csv_writer.writerow(row)
        csv_file.close()
    print("Done!")


def build_load_profile(template):

    start, end, meter_number, meter_start_val = get_user_settings()

    print("Building load profile... ", end='')

    load_profile = []
    START_DATE = datetime.strptime(start, "%Y-%m-%d")
    END_DATE = datetime.strptime(end, "%Y-%m-%d")
    current_datetime = START_DATE
    current_meter_val = meter_start_val

    while current_datetime <= END_DATE:
        seed()
        month_factor = 0.25 * cos(2 * pi / 12 * (current_datetime.month - 0.5)) + 1.50

        if current_datetime is START_DATE:
            load_profile_entry = [current_datetime, meter_number, meter_start_val * month_factor, 0]
        else:
            current_weekday = current_datetime.weekday()
            current_time = current_datetime.time().strftime("%H:%M")
            current_time_data = template[current_weekday][current_time]

            current_load = triangular(current_time_data[0], current_time_data[1], current_time_data[2])
            current_meter_val += current_load * month_factor

            load_profile_entry = [current_datetime, meter_number, round(current_meter_val, 2), 0]

        load_profile.append(load_profile_entry)
        current_datetime += timedelta(minutes=15)

    print("Done!")

    return load_profile


def get_user_settings():
    # Get user input
    start = input("Start date in YYYY-MM-DD format (2018-01-01): ")
    if not start:
        start = "2018-01-01"
    end = input("End date in YYYY-MM-DD format (2019-01-01): ")
    if not end:
        end = "2019-01-01"
    meter_number = input("Meter number (1ESY1312000000): ")
    if not meter_number:
        meter_number = "1ESY1312000000"
    meter_start_val = float(input("Start value (1000): "))
    if not meter_start_val:
        meter_start_val = 1000.0

    return start, end, meter_number, meter_start_val


def menu():
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
            quit()


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
