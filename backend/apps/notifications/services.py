from .models import Notification


PREFERENCE_BY_NOTIFICATION_TYPE = {
    Notification.NotificationType.MARKET_PRICE: 'price_alerts',
    Notification.NotificationType.MARKETPLACE: 'marketplace_offers',
    Notification.NotificationType.ADVISORY: 'weather_alerts',
}


def create_user_notification(
    *,
    user,
    title,
    message,
    notification_type=Notification.NotificationType.SYSTEM,
    action_url='',
    metadata=None,
):
    preference = PREFERENCE_BY_NOTIFICATION_TYPE.get(notification_type)
    preferences = user.notification_preferences or {}
    if preference and preferences.get(preference, True) is False:
        return None
    return Notification.objects.create(
        user=user,
        title=title,
        message=message,
        notification_type=notification_type,
        action_url=action_url,
        metadata=metadata or {},
    )
