from django.db import migrations

# Hazır benchmark yazılımları: (ad, kategori, skor birimi)
SEED = [
    ('Cinebench R23 Multi Core', 'CPU', 'pts'),
    ('Cinebench R23 Single Core', 'CPU', 'pts'),
    ('3DMark Time Spy', 'GPU', 'pts'),
    ('3DMark Steel Nomad', 'GPU', 'pts'),
    ('3DMark Port Royal', 'GPU', 'pts'),
    ('3DMark Stress Test Time Spy', 'GPU', '%'),
]


def forwards(apps, schema_editor):
    """2. adım: hazır yazılımları ekle, mevcut testlerdeki yazılım metinlerini
    yazılım kayıtlarına bağla."""
    Software = apps.get_model('benchmark', 'BenchmarkSoftware')
    Run = apps.get_model('benchmark', 'BenchmarkRun')

    by_name = {}  # küçük harfli ad -> yazılım kaydı
    for name, category, unit in SEED:
        software, _ = Software.objects.get_or_create(
            name=name, defaults={'category': category, 'score_unit': unit}
        )
        by_name[name.lower()] = software
    for software in Software.objects.all():
        by_name.setdefault(software.name.lower(), software)

    for run in Run.objects.select_related('build').all():
        name = (run.software or '').strip() or 'Bilinmeyen test'
        software = by_name.get(name.lower())
        if software is None:
            # Eski metin hazır listede yoksa yeni kayıt açılır, sahibi testin sahibi olur
            software = Software.objects.create(
                name=name[:128], category='Genel', score_unit='',
                created_by_id=run.build.owner_id,
            )
            by_name[software.name.lower()] = software
        run.software_ref = software
        run.save(update_fields=['software_ref'])


class Migration(migrations.Migration):

    dependencies = [
        ('benchmark', '0003_benchmarksoftware_and_nullable_creator'),
    ]

    operations = [
        migrations.RunPython(forwards, migrations.RunPython.noop),
    ]
