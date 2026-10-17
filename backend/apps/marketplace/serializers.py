from pathlib import PurePosixPath
from uuid import uuid4

from django.core.files.storage import default_storage
from rest_framework import serializers
from .models import Listing, Offer, Transaction


class ListingSerializer(serializers.ModelSerializer):
    farmer_name = serializers.CharField(source='farmer.user.get_full_name', read_only=True)
    farmer_phone = serializers.CharField(source='farmer.user.phone_number', read_only=True)
    commodity_name = serializers.CharField(source='commodity.name', read_only=True)
    district_name = serializers.CharField(source='district.name', read_only=True)
    offers_count = serializers.SerializerMethodField()
    images = serializers.SerializerMethodField()
    
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

    def get_images(self, obj):
        request = self.context.get('request')
        urls = []
        for image in obj.images:
            if image.startswith(('http://', 'https://')):
                urls.append(image)
                continue
            url = image if image.startswith('/') else default_storage.url(image)
            urls.append(request.build_absolute_uri(url) if request else url)
        return urls


class ListingCreateSerializer(serializers.ModelSerializer):
    image_files = serializers.ListField(
        child=serializers.ImageField(),
        required=False,
        write_only=True,
    )

    class Meta:
        model = Listing
        fields = [
            'commodity', 'title', 'description', 'quantity_kg',
            'quality_grade', 'expected_price_per_kg',
            'available_from', 'available_until',
            'district', 'latitude', 'longitude', 'pickup_location', 'images',
            'image_files',
        ]

    def validate_image_files(self, images):
        if len(images) > 5:
            raise serializers.ValidationError('Upload no more than five photos.')
        if any(image.size > 10 * 1024 * 1024 for image in images):
            raise serializers.ValidationError('Each photo must be 10 MB or smaller.')
        return images

    def create(self, validated_data):
        image_files = validated_data.pop('image_files', [])
        listing = super().create(validated_data)
        image_paths = list(listing.images)
        for image in image_files:
            suffix = PurePosixPath(image.name).suffix.lower()
            if suffix not in {'.jpg', '.jpeg', '.png', '.webp'}:
                suffix = '.jpg'
            image_paths.append(
                default_storage.save(
                    f'listings/{listing.farmer_id}/{uuid4().hex}{suffix}',
                    image,
                )
            )
        if image_paths != listing.images:
            listing.images = image_paths
            listing.save(update_fields=['images'])
        return listing


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


class OfferStatusSerializer(serializers.ModelSerializer):
    status = serializers.ChoiceField(
        choices=[Offer.Status.ACCEPTED, Offer.Status.REJECTED],
    )

    class Meta:
        model = Offer
        fields = ['status']


class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = '__all__'
        read_only_fields = ['id', 'created_at']