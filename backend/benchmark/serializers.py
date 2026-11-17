from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import BenchmarkRun, BenchmarkSoftware, Component, SystemBuild, TuningProfile

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password']
        extra_kwargs = {'email': {'required': True}}

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class ComponentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Component
        fields = [
            'id', 'type', 'brand', 'name', 'cores',
            'base_clock_mhz', 'boost_clock_mhz', 'tdp_w',
            'max_temp_c', 'memory_gb', 'memory_type', 'cas_latency', 'created_by',
        ]
        read_only_fields = ['id', 'created_by']  # created_by giriş yapan kullanıcıdan alınır
        # Mantıksız değerleri engellemek için üst sınırlar (özellikle max_temp_c throttle tespitinde kullanılır)
        extra_kwargs = {
            'cores': {'max_value': 512},
            'base_clock_mhz': {'max_value': 10000},
            'boost_clock_mhz': {'max_value': 10000},
            'tdp_w': {'max_value': 2000},
            'max_temp_c': {'max_value': 150},
            'memory_gb': {'max_value': 4096},
            'cas_latency': {'min_value': 9, 'max_value': 70},
        }


class BuildSerializer(serializers.ModelSerializer):
    # Parçalar id listesi olarak gönderilir ve döner: "components": [1, 2]
    components = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Component.objects.all(), required=False
    )

    class Meta:
        model = SystemBuild
        fields = ['id', 'name', 'form_factor', 'description', 'owner', 'components', 'created_at']
        read_only_fields = ['id', 'owner', 'created_at']  # owner giriş yapan kullanıcıdan alınır


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = TuningProfile
        fields = [
            'id', 'build', 'name', 'cpu_undervolt_mv', 'gpu_undervolt_mv',
            'power_limit_w', 'fan_profile', 'notes',
        ]
        read_only_fields = ['id', 'build']  # build adresten (URL) alınır

    def _check_undervolt(self, value):
        if value is not None and not (-250 <= value <= 0):
            raise serializers.ValidationError('Undervolt değeri -250 ile 0 mV arasında olmalı.')
        return value

    def validate_cpu_undervolt_mv(self, value):
        return self._check_undervolt(value)

    def validate_gpu_undervolt_mv(self, value):
        return self._check_undervolt(value)

    def validate_power_limit_w(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError("Güç limiti 0'dan büyük olmalı.")
        return value


class SoftwareSerializer(serializers.ModelSerializer):
    class Meta:
        model = BenchmarkSoftware
        fields = ['id', 'name', 'category', 'score_unit', 'created_by']
        read_only_fields = ['id', 'created_by']  # created_by giriş yapan kullanıcıdan alınır


class RunSerializer(serializers.ModelSerializer):
    # Yazılım id olarak gönderilir; adı ve birimi cevapta okunur alan olarak döner
    software_name = serializers.CharField(source='software.name', read_only=True)
    score_unit = serializers.CharField(source='software.score_unit', read_only=True)

    class Meta:
        model = BenchmarkRun
        fields = [
            'id', 'build', 'profile', 'software', 'software_name', 'score_unit', 'score',
            'max_cpu_temp_c', 'max_gpu_temp_c', 'avg_cpu_clock_mhz', 'avg_gpu_clock_mhz',
            'ambient_temp_c', 'notes', 'throttled', 'throttle_reason', 'created_at',
        ]
        # build adresten alınır; throttled / throttle_reason kullanıcıdan alınmaz
        read_only_fields = ['id', 'build', 'throttled', 'throttle_reason', 'created_at']
        # Mantıksız ölçüm değerlerini engellemek için sınırlar (throttle tespiti sıcaklıklara bakar)
        extra_kwargs = {
            'score': {'min_value': 0},
            'max_cpu_temp_c': {'max_value': 150},
            'max_gpu_temp_c': {'max_value': 150},
            'avg_cpu_clock_mhz': {'max_value': 10000},
            'avg_gpu_clock_mhz': {'max_value': 10000},
            'ambient_temp_c': {'min_value': -50, 'max_value': 60},
        }

    def validate_profile(self, profile):
        build = self.context.get('build')
        if profile is not None and build is not None and profile.build_id != build.id:
            raise serializers.ValidationError('Bu profil seçilen sisteme ait değil.')
        return profile


class RunUpdateSerializer(RunSerializer):
    """Test sonucu ölçüm olduğu için sonradan sadece not değiştirilebilir."""

    class Meta(RunSerializer.Meta):
        read_only_fields = [f for f in RunSerializer.Meta.fields if f != 'notes']


# ── Profil kıyaslama (sadece cevap şeması, veritabanı modeli değil) ──────────
class CompareRowSerializer(serializers.Serializer):
    profile_id = serializers.IntegerField(allow_null=True)
    profile_name = serializers.CharField(allow_null=True)
    run_count = serializers.IntegerField()
    avg_score = serializers.FloatField()
    max_cpu_temp = serializers.IntegerField(allow_null=True)
    max_gpu_temp = serializers.IntegerField(allow_null=True)
    throttled_count = serializers.IntegerField()


class CompareSerializer(serializers.Serializer):
    build_id = serializers.IntegerField()
    build_name = serializers.CharField()
    software_id = serializers.IntegerField()
    software_name = serializers.CharField()
    score_unit = serializers.CharField(allow_blank=True)
    rows = CompareRowSerializer(many=True)


class MeSerializer(serializers.ModelSerializer):
    """Giriş yapan kullanıcının bilgileri (şifre asla dönmez)."""

    class Meta:
        model = User
        fields = ['id', 'username', 'email']
