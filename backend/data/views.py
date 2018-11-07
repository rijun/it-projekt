from django.shortcuts import render
from django.http import JsonResponse

def weekday_selected():
    return data

# Create your views here.
def get_data(request, *args, **kwargs):
    user_date = request.GET['date']
    user_name = request.GET['name']

    response = weekday_selected

    return JsonResponse(response)