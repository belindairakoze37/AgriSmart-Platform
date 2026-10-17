from django.db import transaction
from django.db.models import Q
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

from apps.notifications.models import Notification
from apps.notifications.services import create_user_notification
from .models import MarketPrice, PriceAlert


@receiver(post_save, sender=MarketPrice)
def trigger_price_alerts(sender, instance, **kwargs):
    with transaction.atomic():
        alerts = PriceAlert.objects.select_for_update().filter(
            commodity=instance.commodity,
            is_active=True,
            triggered_at__isnull=True,
        ).filter(
            Q(market__isnull=True) | Q(market=instance.market)
        )
        for alert in alerts:
            crossed = (
                alert.condition == 'above'
                and instance.price_per_unit >= alert.target_price
            ) or (
                alert.condition == 'below'
                and instance.price_per_unit <= alert.target_price
            )
            if not crossed:
                continue

            alert.triggered_at = timezone.now()
            alert.is_active = False
            alert.save(update_fields=['triggered_at', 'is_active'])
            create_user_notification(
                user=alert.user,
                title=f'{instance.commodity.name} price alert',
                message=(
                    f'{instance.commodity.name} reached UGX '
                    f'{instance.price_per_unit}/{instance.unit} at '
                    f'{instance.market.name} on {instance.recorded_date}.'
                ),
                notification_type=Notification.NotificationType.MARKET_PRICE,
                action_url=f'/markets/{instance.commodity_id}',
                metadata={
                    'commodity_id': str(instance.commodity_id),
                    'market_id': str(instance.market_id),
                    'price': str(instance.price_per_unit),
                    'target_price': str(alert.target_price),
                },
            )
