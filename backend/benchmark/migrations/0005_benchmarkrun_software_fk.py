import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    """3. adım: eski metin alanını kaldır, geçici alanı 'software' yap ve zorunlu hale getir."""

    dependencies = [
        ('benchmark', '0004_migrate_software_data'),
    ]

    operations = [
        migrations.RemoveField(model_name='benchmarkrun', name='software'),
        migrations.RenameField(model_name='benchmarkrun', old_name='software_ref', new_name='software'),
        migrations.AlterField(
            model_name='benchmarkrun',
            name='software',
            field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='runs', to='benchmark.benchmarksoftware'),
        ),
    ]
