from django.db import migrations


def add_advisory_preference(apps, schema_editor):
    User = apps.get_model('accounts', 'User')
    for user in User.objects.only('id', 'notification_preferences').iterator():
        preferences = user.notification_preferences or {}
        if 'advisories' not in preferences:
            preferences['advisories'] = True
            User.objects.filter(pk=user.pk).update(
                notification_preferences=preferences
            )


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0002_user_notification_preferences'),
    ]

    operations = [
        migrations.RunPython(
            add_advisory_preference,
            migrations.RunPython.noop,
        ),
    ]
