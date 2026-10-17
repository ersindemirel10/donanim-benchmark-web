from django.conf import settings
from django.db import models


class Component(models.Model):
    """Donanım parçası: CPU, GPU veya RAM."""

    class Type(models.TextChoices):
        CPU = 'CPU', 'CPU'
        GPU = 'GPU', 'GPU'
        RAM = 'RAM', 'RAM'

    type = models.CharField(max_length=3, choices=Type.choices)
    brand = models.CharField(max_length=64)
    name = models.CharField(max_length=128)
    cores = models.PositiveIntegerField(null=True, blank=True)
    base_clock_mhz = models.PositiveIntegerField(null=True, blank=True)
    boost_clock_mhz = models.PositiveIntegerField(null=True, blank=True)
    tdp_w = models.PositiveIntegerField(null=True, blank=True)
    max_temp_c = models.PositiveIntegerField(null=True, blank=True)  # termal eşik
    memory_gb = models.PositiveIntegerField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='components'
    )

    def __str__(self):
        return f'{self.brand} {self.name} ({self.type})'


class SystemBuild(models.Model):
    """Kullanıcının test ettiği sistem (laptop veya masaüstü)."""

    class FormFactor(models.TextChoices):
        LAPTOP = 'Laptop', 'Laptop'
        DESKTOP = 'Masaüstü', 'Masaüstü'

    name = models.CharField(max_length=128)
    form_factor = models.CharField(max_length=16, choices=FormFactor.choices)
    description = models.TextField(blank=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='builds'
    )
    components = models.ManyToManyField(Component, related_name='builds', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class TuningProfile(models.Model):
    """Bir sisteme ait ayar profili (undervolt, güç limiti, fan)."""

    class FanProfile(models.TextChoices):
        QUIET = 'Sessiz', 'Sessiz'
        BALANCED = 'Dengeli', 'Dengeli'
        PERFORMANCE = 'Performans', 'Performans'
        MAX = 'Maksimum', 'Maksimum'

    build = models.ForeignKey(
        SystemBuild, on_delete=models.CASCADE, related_name='profiles'
    )
    name = models.CharField(max_length=128)
    cpu_undervolt_mv = models.IntegerField(null=True, blank=True)  # -250..0
    gpu_undervolt_mv = models.IntegerField(null=True, blank=True)  # -250..0
    power_limit_w = models.PositiveIntegerField(null=True, blank=True)
    fan_profile = models.CharField(
        max_length=16, choices=FanProfile.choices, null=True, blank=True
    )
    notes = models.TextField(blank=True)

    def __str__(self):
        return f'{self.build.name} - {self.name}'


class BenchmarkRun(models.Model):
    """Bir benchmark test sonucu. throttled alanlarını backend hesaplar."""

    build = models.ForeignKey(
        SystemBuild, on_delete=models.CASCADE, related_name='runs'
    )
    profile = models.ForeignKey(
        TuningProfile, on_delete=models.SET_NULL, null=True, blank=True, related_name='runs'
    )
    software = models.CharField(max_length=128)
    score = models.FloatField()
    max_cpu_temp_c = models.PositiveIntegerField(null=True, blank=True)
    max_gpu_temp_c = models.PositiveIntegerField(null=True, blank=True)
    avg_cpu_clock_mhz = models.PositiveIntegerField(null=True, blank=True)
    avg_gpu_clock_mhz = models.PositiveIntegerField(null=True, blank=True)
    ambient_temp_c = models.IntegerField(null=True, blank=True)
    notes = models.TextField(blank=True)
    throttled = models.BooleanField(default=False)  # backend set eder
    throttle_reason = models.CharField(max_length=256, blank=True)  # backend set eder
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.software}: {self.score} ({self.build.name})'
