from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import Component

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
