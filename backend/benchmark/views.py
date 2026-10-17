from django.contrib.auth import get_user_model
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import generics, permissions, status
from rest_framework.response import Response

from .models import Component
from .serializers import ComponentSerializer, RegisterSerializer

User = get_user_model()


@extend_schema(
    tags=['Auth'],
    summary='Yeni kullanıcı kaydı',
    responses={
        201: RegisterSerializer,
        400: OpenApiResponse(description='Doğrulama hatası'),
        409: OpenApiResponse(description='Kullanıcı adı veya e-posta zaten kayıtlı'),
    },
)
class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def create(self, request, *args, **kwargs):
        username = request.data.get('username')
        email = request.data.get('email')
        if username and User.objects.filter(username=username).exists():
            return Response(
                {'detail': 'Bu kullanıcı adı zaten kayıtlı.'}, status=status.HTTP_409_CONFLICT
            )
        if email and User.objects.filter(email__iexact=email).exists():
            return Response(
                {'detail': 'Bu e-posta zaten kayıtlı.'}, status=status.HTTP_409_CONFLICT
            )
        return super().create(request, *args, **kwargs)


@extend_schema(tags=['Components'])
class ComponentListCreateView(generics.ListCreateAPIView):
    """GET: parçaları listeler (herkes). POST: parça ekler (giriş gerekir)."""

    queryset = Component.objects.all().order_by('id')
    serializer_class = ComponentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
