import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')

app = Celery('agrismart')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

# Scheduled tasks
app.conf.beat_schedule = {
    'generate-price-forecasts-weekly': {
        'task': 'apps.forecasts.tasks.generate_all_price_forecasts',
        'schedule': crontab(day_of_week=1, hour=2, minute=0),  # Every Monday at 2 AM
    },
}