from rest_framework import serializers
from .models import Listing, Offer, Transaction


class ListingSerializer(serializers.ModelSerializer):
    farmer_name = serializers.CharField(source='farmer.user.get_full_name', read_only=True)
    farmer_phone = serializers.CharField(source='farmer.user.phone_number', read_only=True)
    commodity_name = serializers.CharField(source='commodity.name', read_only=True)
    district_name = serializers.CharField(source='district.name', read_only=True)
    offers_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Listing
        fields = [
            'id', 'farmer', 'farmer_name', 'farmer_phone',
            'commodity', 'commodity_name', 'title', 'description',
            'quantity_kg', 'quality_grade', 'expected_price_per_kg',
            'available_from', 'available_until',
            'district', 'district_name', 'latitude', 'longitude',
            'pickup_location', 'images', 'status', 'views_count',
            'offers_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'farmer', 'views_count', 'created_at', 'updated_at']
    
    def get_offers_count(self, obj):
        return obj.offers.filter(status='pending').count()


class ListingCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Listing
        fields = [
            'commodity', 'title', 'description', 'quantity_kg',
            'quality_grade', 'expected_price_per_kg',
            'available_from', 'available_until',
            'district', 'latitude', 'longitude',
            'pickup_location', 'images'
        ]


class OfferSerializer(serializers.ModelSerializer):
    buyer_name = serializers.CharField(source='buyer.get_full_name', read_only=True)
    buyer_phone = serializers.CharField(source='buyer.phone_number', read_only=True)
    listing_title = serializers.CharField(source='listing.title', read_only=True)
    
    class Meta:
        model = Offer
        fields = [
            'id', 'listing', 'listing_title',
            'buyer', 'buyer_name', 'buyer_phone',
            'offered_price_per_kg', 'quantity_kg',
            'pickup_date', 'message', 'status',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'buyer', 'status', 'created_at', 'updated_at']


class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = '__all__'
        read_only_fields = ['id', 'created_at']