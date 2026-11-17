import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    """1. adım: yazılım tablosunu oluştur, parça sahibini boş bırakılabilir yap,
    testlere geçici (boş bırakılabilir) yazılım bağlantısı ekle."""

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('benchmark', '0002_component_cas_latency_component_memory_type'),
    ]

    operations = [
        migrations.CreateModel(
            name='BenchmarkSoftware',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=128, unique=True)),
                ('category', models.CharField(choices=[('CPU', 'CPU'), ('GPU', 'GPU'), ('Genel', 'Genel')], max_length=8)),
                ('score_unit', models.CharField(blank=True, max_length=16)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='benchmark_software', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AlterField(
            model_name='component',
            name='created_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='components', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='benchmarkrun',
            name='software_ref',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.PROTECT, related_name='runs', to='benchmark.benchmarksoftware'),
        ),
    ]
