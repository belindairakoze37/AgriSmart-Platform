from django.urls import path
from . import views
from . import admin_api

urlpatterns = [
    path('admin/dashboard/', admin_api.admin_dashboard, name='admin-dashboard'),
    path('admin/commodities/', admin_api.AdminCommodityListCreateView.as_view(), name='admin-commodity-list'),
    path('admin/commodities/<uuid:pk>/', admin_api.AdminCommodityDetailView.as_view(), name='admin-commodity-detail'),
    path('admin/prices/import/', admin_api.import_market_prices, name='admin-price-import'),
    path('districts/', views.DistrictListView.as_view(), name='district-list'),
    path('markets/', views.MarketListView.as_view(), name='market-list'),
    path('commodities/', views.CommodityListView.as_view(), name='commodity-list'),
    path('prices/', views.MarketPriceListView.as_view(), name='price-list'),
    path('prices/current/', views.current_prices, name='current-prices'),
    path('prices/history/', views.price_history, name='price-history'),
    path('alerts/', views.PriceAlertListCreateView.as_view(), name='alert-list'),
    path('alerts/<uuid:pk>/', views.PriceAlertDetailView.as_view(), name='alert-detail'),
]