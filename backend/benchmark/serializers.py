from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import Component, SystemBuild, TuningProfile

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
            'max_temp_c', 'memory_gb', 'created_by',
        ]
        read_only_fields = ['id', 'created_by']  # created_by giriş yapan kullanıcıdan alınır


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
