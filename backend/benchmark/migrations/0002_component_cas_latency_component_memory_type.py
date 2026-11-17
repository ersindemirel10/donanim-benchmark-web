from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('benchmark', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='component',
            name='memory_type',
            field=models.CharField(
                blank=True, choices=[('DDR4', 'DDR4'), ('DDR5', 'DDR5')], max_length=4, null=True
            ),
        ),
        migrations.AddField(
            model_name='component',
            name='cas_latency',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
    ]
