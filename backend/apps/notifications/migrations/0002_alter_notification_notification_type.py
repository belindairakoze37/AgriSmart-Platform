from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('notifications', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='notification',
            name='notification_type',
            field=models.CharField(
                choices=[
                    ('market_price', 'Market Price'),
                    ('advisory', 'Advisory'),
                    ('disease', 'Disease'),
                    ('marketplace', 'Marketplace'),
                    ('system', 'System'),
                ],
                default='system',
                max_length=30,
            ),
        ),
    ]
