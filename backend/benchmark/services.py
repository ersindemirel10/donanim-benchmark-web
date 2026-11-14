"""İş kuralları: kullanıcıdan gelen veriye bakarak backend'in kendisinin hesapladığı şeyler."""
from .models import Component


def detect_throttle(build, max_cpu_temp_c, max_gpu_temp_c):
    """Termal darboğaz tespiti.

    Testte ölçülen en yüksek sıcaklık, sistemdeki bir parçanın termal sınırına
    (Component.max_temp_c) ulaştıysa test 'throttled' sayılır.

    Dönüş: (throttled, sebep)
    """
    checks = [
        (Component.Type.CPU, max_cpu_temp_c),
        (Component.Type.GPU, max_gpu_temp_c),
    ]
    reasons = []
    for comp_type, measured in checks:
        if measured is None:  # o sıcaklık girilmediyse kontrol edilmez
            continue
        parts = build.components.filter(type=comp_type, max_temp_c__isnull=False)
        for part in parts:
            if measured >= part.max_temp_c:
                reasons.append(
                    f'{comp_type} termal sınırına ulaştı '
                    f'({measured}°C >= {part.max_temp_c}°C, {part.brand} {part.name})'
                )
    return bool(reasons), '; '.join(reasons)
