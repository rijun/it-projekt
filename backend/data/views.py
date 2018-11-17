from django.shortcuts import render
from django.http import JsonResponse
import json
import pymysql


my_Database = pymysql.connect(
    host="127.0.0.1",
    user="root",
    passwd="root",
    database= "itp2",
            )



#request = input()                       # just for demonstration

def get_data(request, *args, **kwargs):
    user_date = request.GET['date']
    user_name = request.GET['name']

return_value = my_Database.cursor()

if  request == ("day"):           
    return_value.execute("SELECT * FROM zaehlwerte WHERE HOUR(datum_zeit) = 0 AND MINUTE(datum_zeit) = 0")
elif request == ("week"):
    return_value.execute("SELECT * FROM zaehlwerte WHERE DAYOFWEEK(datum_zeit)=1 AND HOUR(datum_zeit) = 0 AND MINUTE(datum_zeit) = 0")     # Zaehlerstand wochenweise auswählen
elif request == ("month"):
    return_value.execute("SELECT * FROM zaehlwerte WHERE DAY(datum_zeit) = 29 AND HOUR (datum_zeit) =0 AND MINUTE(datum_zeit) = 0")
elif request == ("Intervall"):
    return_value.execute()
else:
    print ("that's not a valid input")

my_result= return_value.fetchall()


date =[]
counter_number =[]
energy =[] 
load =[]
     
    
for result in my_result:      
    
       date.append(result[0])
       counter_number.append(result[1])
       energy.append(result[2])
       load.append(result[3])
    
data = [date, counter_number, energy, load]

print (data)


def weekday_selected():
    return data

    return JsonResponse(response)
