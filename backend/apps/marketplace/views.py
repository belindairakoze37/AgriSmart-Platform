from django.db.models import Q
from rest_framework import generics, permissions, serializers, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.accounts.models import FarmerProfile
from .models import Listing, Offer, Transaction
from .serializers import (
    ListingSerializer, ListingCreateSerializer,
    OfferSerializer, TransactionSerializer
)


class ListingListCreateView(generics.ListCreateAPIView):
    """List all active listings or create new"""
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filterset_fields = ['commodity', 'district', 'status', 'quality_grade']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'expected_price_per_kg', 'quantity_kg']
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ListingCreateSerializer
        return ListingSerializer
    
    def get_queryset(self):
        qs = Listing.objects.filter(status=Listing.Status.ACTIVE)
        
        # Exclude own listings from browse
        if self.request.user.is_authenticated:
            qs = qs.exclude(farmer__user=self.request.user)
        
        # Price range filter
        min_price = self.request.query_params.get('min_price')
        max_price = self.request.query_params.get('max_price')
        if min_price:
            qs = qs.filter(expected_price_per_kg__gte=min_price)
        if max_price:
            qs = qs.filter(expected_price_per_kg__lte=max_price)
        
        return qs.select_related('farmer__user', 'commodity', 'district')
    
    def perform_create(self, serializer):
        farmer, _ = FarmerProfile.objects.get_or_create(
            user=self.request.user,
            defaults={'district': 'Unknown'}
        )
        serializer.save(farmer=farmer)


class MyListingsView(generics.ListAPIView):
    """List current user's listings"""
    serializer_class = ListingSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Listing.objects.filter(
            farmer__user=self.request.user
        ).select_related('commodity', 'district')


class ListingDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Get, update or delete a listing"""
    serializer_class = ListingSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    
    def get_queryset(self):
        return Listing.objects.all()
    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Increment view count
        Listing.objects.filter(pk=instance.pk).update(views_count=instance.views_count + 1)
        return super().retrieve(request, *args, **kwargs)
    
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.farmer.user != request.user:
            return Response(
                {'error': 'You can only edit your own listings'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.farmer.user != request.user:
            return Response(
                {'error': 'You can only delete your own listings'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)


class OfferListCreateView(generics.ListCreateAPIView):
    """List or create offers"""
    serializer_class = OfferSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['listing', 'status']
    
    def get_queryset(self):
        user = self.request.user
        # Show offers made by user OR offers on user's listings
        return Offer.objects.filter(
            Q(buyer=user) | Q(listing__farmer__user=user)
        ).select_related('buyer', 'listing', 'listing__commodity')
    
    def perform_create(self, serializer):
        listing = serializer.validated_data['listing']
        
        # Can't offer on own listing
        if listing.farmer.user == self.request.user:
            raise serializers.ValidationError("You can't make an offer on your own listing")
        
        # Can't offer more than available
        if serializer.validated_data['quantity_kg'] > listing.quantity_kg:
            raise serializers.ValidationError(
                f"Only {listing.quantity_kg}kg available"
            )
        
        serializer.save(buyer=self.request.user)


class OfferDetailView(generics.RetrieveUpdateAPIView):
    """Manage an offer (accept/reject)"""
    serializer_class = OfferSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        return Offer.objects.filter(
            Q(buyer=user) | Q(listing__farmer__user=user)
        )
    
    def update(self, request, *args, **kwargs):
        offer = self.get_object()
        
        # Only listing owner can accept/reject
        new_status = request.data.get('status')
        if new_status in ['accepted', 'rejected']:
            if offer.listing.farmer.user != request.user:
                return Response(
                    {'error': 'Only the listing owner can accept or reject offers'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            if new_status == 'accepted':
                # Create transaction
                total = offer.offered_price_per_kg * offer.quantity_kg
                Transaction.objects.create(
                    listing=offer.listing,
                    offer=offer,
                    final_price_per_kg=offer.offered_price_per_kg,
                    total_amount=total,
                )
                # Mark listing as sold
                offer.listing.status = Listing.Status.SOLD
                offer.listing.save()
                
                # Reject other pending offers
                offer.listing.offers.filter(
                    status=Offer.Status.PENDING
                ).exclude(pk=offer.pk).update(status=Offer.Status.REJECTED)
        
        return super().update(request, *args, **kwargs)


class MyOffersView(generics.ListAPIView):
    """List offers made by current user"""
    serializer_class = OfferSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Offer.objects.filter(buyer=self.request.user)


class TransactionListView(generics.ListAPIView):
    """List transactions for current user"""
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        return Transaction.objects.filter(
            Q(listing__farmer__user=user) | Q(offer__buyer=user)
        )