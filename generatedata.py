import csv
import datetime
import json

csv_data = []

# Open file
with open("zaehlwerte.csv", mode='r') as csv_file:
    csv_reader = csv.reader(csv_file)
    line_count = 0

    for row in csv_reader:
        if line_count != 0:
            row_date = datetime.datetime.strptime(row[0], "%Y-%m-%d %H:%M")
            if row_date.minute % 15 == 0:
                csv_data.append([row_date, float(row[2])])
        line_count += 1
    csv_file.close()

# Convert energy to load
for i in range(len(csv_data) - 1):
    current_data = csv_data[i][1]
    next_data = csv_data[i + 1][1]
    diff = round(next_data - current_data, 2)
    csv_data[i][1] = diff

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
        weekday_dict[time] = (min_load, max_load)

print(json.dumps(data_dict))
