from django.shortcuts import render
from django.http import JsonResponse

# Create your views here.
def get_data(request, *args, **kwargs):
    response = {
        "dates": [1, 2, 3, 4],
        "energy": [10, 20, 30, 40],
        "load": [100, 200, 300, 400],
    }
    return JsonResponse(response)