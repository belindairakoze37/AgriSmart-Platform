from django.urls import path
from . import views

urlpatterns = [
    path('listings/', views.ListingListCreateView.as_view(), name='listing-list'),
    path('listings/mine/', views.MyListingsView.as_view(), name='my-listings'),
    path('listings/<uuid:pk>/', views.ListingDetailView.as_view(), name='listing-detail'),
    path('offers/', views.OfferListCreateView.as_view(), name='offer-list'),
    path('offers/mine/', views.MyOffersView.as_view(), name='my-offers'),
    path('offers/<uuid:pk>/', views.OfferDetailView.as_view(), name='offer-detail'),
    path('transactions/', views.TransactionListView.as_view(), name='transaction-list'),
]