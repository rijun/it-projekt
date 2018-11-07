from django.shortcuts import render
from django.http import JsonResponse
import mysql.connector

my_Database = mysql.connector.connect(
  host="127.0.0.1",
  user="root",
  passwd="root",
  database= "itp2",
  )

request = input()                       # just for demonstration

def get_data(request, *args, **kwargs):
    user_date = request.GET['date']
    user_name = request.GET['name']

return_value = my_Database.cursor()

if request == ("day"):
    return_value.execute("SELECT * FROM zaehlwerte WHERE HOUR(datum_zeit) = 0 AND MINUTE(datum_zeit) = 0")
elif request == ("week"):
    return_value.execute("SELECT obis_180 FROM zaehlwerte WHERE DAYOFWEEK(datum_zeit)=1 AND HOUR(datum_zeit) = 0 AND MINUTE(datum_zeit) = 0")     # Zaehlerstand wochenweise auswählen
elif request == ("month"):
    return_value.execute("SELECT * FROM zaehlwerte WHERE DAY(datum_zeit) = 29 AND HOUR (datum_zeit) =0 AND MINUTE(datum_zeit) = 0")
elif request == ("Intervall"):
    return_value.execute()
else:
    print ("that's not a valid input")



myresult = return_value.fetchall()

for data in myresult:
  print(data)


def weekday_selected():
    return data


    return JsonResponse(response)
