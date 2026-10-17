"""
Health check script for AgriSmart backend.
Run: python check_health.py
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.accounts.models import User
from apps.markets.models import District, Market, Commodity, MarketPrice

print("=" * 50)
print("AGRISMART HEALTH CHECK")
print("=" * 50)

# Check models
print(f"\n📊 Database counts:")
print(f"   Users:        {User.objects.count()}")
print(f"   Districts:    {District.objects.count()}")
print(f"   Markets:      {Market.objects.count()}")
print(f"   Commodities:  {Commodity.objects.count()}")
print(f"   Prices:       {MarketPrice.objects.count()}")

# Check first commodity
first_comm = Commodity.objects.first()
if first_comm:
    print(f"\n Sample commodity: {first_comm.name} (id={first_comm.id})")
else:
    print("\n❌ No commodities found. Run: python manage.py seed_markets")

# Check first price
first_price = MarketPrice.objects.first()
if first_price:
    print(f" Sample price: {first_price.commodity.name} @ "
          f"{first_price.market.name} = {first_price.price_per_unit} "
          f"{first_price.unit} on {first_price.recorded_date}")

print("\n" + "=" * 50)
print("✅ Health check complete")
print("=" * 50)