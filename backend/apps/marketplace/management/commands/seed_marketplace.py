from datetime import date

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.accounts.models import FarmerProfile
from apps.markets.models import Commodity, District
from apps.marketplace.models import Listing


User = get_user_model()


SAMPLE_LISTINGS = (
    {
        'seller': 'gulu',
        'first_name': 'Demo Farmer',
        'last_name': 'Gulu',
        'phone': '+256000000001',
        'district': 'Gulu',
        'region': 'Northern',
        'commodity': 'Maize',
        'category': 'cereal',
        'title': 'Sample listing: dried maize grain',
        'description': 'Sample marketplace data for demonstration only. Not a real offer.',
        'quantity_kg': '850.00',
        'quality_grade': Listing.QualityGrade.A,
        'price': '1250.00',
        'pickup_location': 'Gulu town collection point',
    },
    {
        'seller': 'gulu',
        'first_name': 'Demo Farmer',
        'last_name': 'Gulu',
        'phone': '+256000000001',
        'district': 'Gulu',
        'region': 'Northern',
        'commodity': 'Beans',
        'category': 'legume',
        'title': 'Sample listing: clean dry beans',
        'description': 'Sample marketplace data for demonstration only. Not a real offer.',
        'quantity_kg': '320.00',
        'quality_grade': Listing.QualityGrade.B,
        'price': '2800.00',
        'pickup_location': 'Layibi trading centre',
    },
    {
        'seller': 'lira',
        'first_name': 'Demo Farmer',
        'last_name': 'Lira',
        'phone': '+256000000002',
        'district': 'Lira',
        'region': 'Northern',
        'commodity': 'Groundnuts',
        'category': 'legume',
        'title': 'Sample listing: shelled groundnuts',
        'description': 'Sample marketplace data for demonstration only. Not a real offer.',
        'quantity_kg': '180.00',
        'quality_grade': Listing.QualityGrade.A,
        'price': '4600.00',
        'pickup_location': 'Lira central collection point',
    },
    {
        'seller': 'mbarara',
        'first_name': 'Demo Farmer',
        'last_name': 'Mbarara',
        'phone': '+256000000003',
        'district': 'Mbarara',
        'region': 'Western',
        'commodity': 'Rice',
        'category': 'cereal',
        'title': 'Sample listing: milled rice',
        'description': 'Sample marketplace data for demonstration only. Not a real offer.',
        'quantity_kg': '500.00',
        'quality_grade': Listing.QualityGrade.A,
        'price': '3900.00',
        'pickup_location': 'Mbarara market area',
    },
    {
        'seller': 'mbarara',
        'first_name': 'Demo Farmer',
        'last_name': 'Mbarara',
        'phone': '+256000000003',
        'district': 'Mbarara',
        'region': 'Western',
        'commodity': 'Coffee',
        'category': 'cash_crop',
        'title': 'Sample listing: dried coffee beans',
        'description': 'Sample marketplace data for demonstration only. Not a real offer.',
        'quantity_kg': '95.00',
        'quality_grade': Listing.QualityGrade.A,
        'price': '11200.00',
        'pickup_location': 'Mbarara collection point',
    },
    {
        'seller': 'mbale',
        'first_name': 'Demo Farmer',
        'last_name': 'Mbale',
        'phone': '+256000000004',
        'district': 'Mbale',
        'region': 'Eastern',
        'commodity': 'Tomatoes',
        'category': 'vegetable',
        'title': 'Sample listing: fresh tomatoes',
        'description': 'Sample marketplace data for demonstration only. Not a real offer.',
        'quantity_kg': '240.00',
        'quality_grade': Listing.QualityGrade.B,
        'price': '2100.00',
        'pickup_location': 'Mbale town collection point',
    },
)


class Command(BaseCommand):
    help = 'Create clearly marked, non-purchasable sample marketplace listings.'

    @transaction.atomic
    def handle(self, *args, **options):
        sellers = {}
        for sample in SAMPLE_LISTINGS:
            seller_key = sample['seller']
            if seller_key in sellers:
                continue
            user, created = User.objects.get_or_create(
                username=f'agrismart-sample-seller-{seller_key}',
                defaults={
                    'phone_number': sample['phone'],
                    'first_name': sample['first_name'],
                    'last_name': sample['last_name'],
                    'email': f'sample-{seller_key}@example.invalid',
                    'role': User.Role.FARMER,
                    'is_active': False,
                },
            )
            if created:
                user.set_unusable_password()
                user.save(update_fields=['password'])
            elif user.is_active:
                raise CommandError(
                    f'Sample seller account {user.username} is active; '
                    'refusing to change an active account.'
                )

            sellers[seller_key], _ = FarmerProfile.objects.get_or_create(
                user=user,
                defaults={
                    'district': sample['district'],
                    'primary_crops': [],
                },
            )

        for sample in SAMPLE_LISTINGS:
            district, _ = District.objects.get_or_create(
                name=sample['district'],
                defaults={'region': sample['region']},
            )
            commodity, _ = Commodity.objects.get_or_create(
                name=sample['commodity'],
                defaults={'category': sample['category']},
            )
            Listing.objects.update_or_create(
                title=sample['title'],
                is_demo=True,
                defaults={
                    'farmer': sellers[sample['seller']],
                    'commodity': commodity,
                    'district': district,
                    'description': sample['description'],
                    'quantity_kg': sample['quantity_kg'],
                    'quality_grade': sample['quality_grade'],
                    'expected_price_per_kg': sample['price'],
                    'available_from': date.today(),
                    'pickup_location': sample['pickup_location'],
                    'images': [],
                    'status': Listing.Status.ACTIVE,
                },
            )

        self.stdout.write(
            self.style.SUCCESS(
                f'Seeded {Listing.objects.filter(is_demo=True).count()} sample listings.'
            )
        )
