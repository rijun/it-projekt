from csv import QUOTE_NONE, reader, writer
from datetime import datetime, timedelta
from json import dumps
from math import cos, pi
from statistics import mean
from random import seed, triangular


def generate_template(filename="zaehlwerte.csv"):
    csv_data = []

    # Open file
    with open(filename, mode='r') as csv_file:
        csv_reader = reader(csv_file)
        line_count = 0

        for row in csv_reader:
            if line_count != 0:
                row_date = datetime.strptime(row[0], "%Y-%m-%d %H:%M:%S")
                if row_date.minute % 15 == 0:
                    csv_data.append([row_date, float(row[2])])
            line_count += 1
        csv_file.close()

    # Convert energy to load
    for i in range(len(csv_data)-1):
        current_data = csv_data[i][1]
        next_data = csv_data[i + 1][1]
        diff = round(next_data - current_data, 2)
        csv_data[i][1] = diff

    csv_data.pop()
    week_dict = {}

    # Build week dictionary
    for data in csv_data:
        current_weekday = data[0].weekday()
        if current_weekday not in week_dict:
            week_dict[current_weekday] = {}
        weekday_dict = week_dict[current_weekday]
        current_time = data[0].strftime("%H:%M")
        if current_time not in weekday_dict:
            weekday_dict[current_time] = []
        weekday_dict[current_time].append(data[1])

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

    f = open("load_statistics.json", 'w')
    f.write(dumps(data_dict))
    f.close()

    return data_dict


def generate_load_profile(template):
    # Get user input
    start = input("Start date (YYYY-MM-DD): ")
    if not start:
        start = "2018-01-01"
    end = input("End date (YYYY-MM-DD): ")
    if not end:
        end = "2019-01-01"
    meter_start_val = input("Start value: ")
    if not meter_start_val:
        meter_start_val = 1000
    meter_number = input("Meter number: ")
    if not meter_number:
        meter_number = "1ESY1312000000"

    seed()
    START_DATE = datetime.strptime(start, "%Y-%m-%d")
    END_DATE = datetime.strptime(end, "%Y-%m-%d")
    current_datetime = START_DATE

    csv_entry_list = []
    current_meter_val = meter_start_val

    while current_datetime <= END_DATE:
        month_factor = 0.25*cos(2*pi/12*(current_datetime.month-0.5))+1.50
        if current_datetime is START_DATE:
            csv_entry = [current_datetime, meter_number, meter_start_val * month_factor, 0]
            csv_entry_list.append(csv_entry)
            current_datetime += timedelta(minutes=15)
            continue

        current_weekday = current_datetime.weekday()
        current_time = current_datetime.time().strftime("%H:%M")
        current_time_data = template[current_weekday][current_time]
        current_load = triangular(current_time_data[0], current_time_data[1], current_time_data[2])
        current_meter_val += current_load * month_factor
        csv_entry = [current_datetime, meter_number, round(current_meter_val, 2), 0]
        csv_entry_list.append(csv_entry)
        current_datetime += timedelta(minutes=15)

    with open('meter_data.csv', mode='w') as csv_file:
        csv_writer = writer(csv_file, delimiter=',', quotechar='"', quoting=QUOTE_NONE)
        for row in csv_entry_list:
            csv_writer.writerow(row)
        csv_file.close()


def main():
    template = input("Template file path:")
    if not template:
        data_template = generate_template()
    else:
        data_template = generate_template(template)
    generate_load_profile(data_template)


if __name__ == "__main__":
    main()
