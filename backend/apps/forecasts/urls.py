from django.urls import path
from . import views

urlpatterns = [
    path('', views.PriceForecastListView.as_view(), name='forecast-list'),
    path('generate/', views.get_forecast, name='forecast-generate'),
]