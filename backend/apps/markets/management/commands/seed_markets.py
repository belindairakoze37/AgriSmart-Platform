from django.core.management.base import BaseCommand
from apps.markets.models import District, Market, Commodity, MarketPrice
from datetime import date, timedelta
import random


class Command(BaseCommand):
    help = 'Seed markets with initial data'
    
    def handle(self, *args, **options):
        # Districts
        districts_data = [
            ('Kampala', 'Central', 0.3476, 32.5825),
            ('Gulu', 'Northern', 2.7746, 32.2990),
            ('Lira', 'Northern', 2.2499, 32.8998),
            ('Mbarara', 'Western', -0.6072, 30.6545),
            ('Mbale', 'Eastern', 1.0803, 34.1750),
            ('Jinja', 'Eastern', 0.4244, 33.2041),
            ('Arua', 'Northern', 3.0204, 30.9110),
            ('Fort Portal', 'Western', 0.6547, 30.2749),
        ]
        
        districts = {}
        for name, region, lat, lng in districts_data:
            d, _ = District.objects.get_or_create(
                name=name,
                defaults={'region': region, 'latitude': lat, 'longitude': lng}
            )
            districts[name] = d
            self.stdout.write(f'District: {name}')
        
        # Markets
        markets_data = [
            ('Kampala Central Market', 'Kampala', 'national', 0.3136, 32.5811),
            ('Gulu Main Market', 'Gulu', 'regional', 2.7746, 32.2990),
            ('Lira Main Market', 'Lira', 'regional', 2.2499, 32.8998),
            ('Mbarara Market', 'Mbarara', 'regional', -0.6072, 30.6545),
            ('Mbale Market', 'Mbale', 'regional', 1.0803, 34.1750),
            ('Jinja Market', 'Jinja', 'regional', 0.4244, 33.2041),
        ]
        
        markets = {}
        for name, district_name, mtype, lat, lng in markets_data:
            m, _ = Market.objects.get_or_create(
                name=name,
                defaults={
                    'district': districts[district_name],
                    'market_type': mtype,
                    'latitude': lat,
                    'longitude': lng,
                }
            )
            markets[name] = m
        
        # Commodities
        commodities_data = [
            ('Maize', 'cereal', {'luganda': 'Kasooli', 'swahili': 'Mahindi'}, 1000),
            ('Beans', 'legume', {'luganda': 'Ffuba'}, 2200),
            ('Rice', 'cereal', {'luganda': 'Omuceere'}, 3500),
            ('Groundnuts', 'legume', {'luganda': 'Ebinyebwa'}, 3000),
            ('Cassava', 'root', {'luganda': 'Muwogo'}, 800),
            ('Sweet Potatoes', 'root', {'luganda': 'Lumonde'}, 700),
            ('Matooke', 'fruit', {'luganda': 'Ekitooke'}, 1500),
            ('Tomatoes', 'vegetable', {'luganda': 'Ennyaanya'}, 2500),
            ('Onions', 'vegetable', {'luganda': 'Obukungu'}, 3000),
            ('Coffee', 'cash_crop', {'luganda': 'Emwanyi'}, 8000),
        ]
        
        commodities = {}
        for name, category, local_names, base_price in commodities_data:
            c, _ = Commodity.objects.get_or_create(
                name=name,
                defaults={
                    'category': category,
                    'local_names': local_names,
                }
            )
            commodities[name] = (c, base_price)
        
        # Generate historical prices (last 12 months)
        self.stdout.write('Generating historical prices...')
        today = date.today()
        
        for market in markets.values():
            for commodity_name, (commodity, base_price) in commodities.items():
                # Generate weekly prices for 12 months
                for weeks_ago in range(52, -1, -1):
                    recorded_date = today - timedelta(weeks=weeks_ago)
                    
                    # Add seasonality and randomness
                    month = recorded_date.month
                    seasonal_factor = 1.0
                    if month in [6, 7, 10, 11, 12]:  # Harvest season
                        seasonal_factor = 0.85
                    elif month in [3, 4, 8, 9]:  # Planting season
                        seasonal_factor = 1.15
                    
                    # Random variation
                    random_factor = random.uniform(0.9, 1.1)
                    
                    price = base_price * seasonal_factor * random_factor
                    
                    MarketPrice.objects.get_or_create(
                        market=market,
                        commodity=commodity,
                        price_type='wholesale',
                        recorded_date=recorded_date,
                        defaults={
                            'price_per_unit': round(price, 2),
                            'unit': 'kg',
                            'source': 'seed_data',
                        }
                    )
        
        self.stdout.write(self.style.SUCCESS(
            f'Seeded {District.objects.count()} districts, '
            f'{Market.objects.count()} markets, '
            f'{Commodity.objects.count()} commodities, '
            f'{MarketPrice.objects.count()} price records'
        ))