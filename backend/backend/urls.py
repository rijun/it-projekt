"""
Definition of urls for backend.
"""

from django.conf.urls import include, url
from django.urls import path

# Uncomment the next two lines to enable the admin:
from django.contrib import admin
from data.views import get_data

urlpatterns = [
    # Examples:
    # url(r'^$', backend.views.home, name='home'),
    # url(r'^backend/', include('backend.backend.urls')),

    # Uncomment the admin/doc line below to enable admin documentation:
    # url(r'^admin/doc/', include('django.contrib.admindocs.urls')),

    # Uncomment the next line to enable the admin:
    path('admin', admin.site.urls),
    path('data', get_data, name='data'),
]
