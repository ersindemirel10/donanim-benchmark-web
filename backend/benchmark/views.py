from django.contrib.auth import get_user_model
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import generics, permissions, status
from rest_framework.response import Response

from .models import Component, SystemBuild
from .permissions import IsBuildOwner, IsCreatorOrReadOnly
from .serializers import BuildSerializer, ComponentSerializer, RegisterSerializer

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


@extend_schema(tags=['Components'])
class ComponentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET: tek parça. PUT/PATCH/DELETE: sadece parçayı ekleyen kullanıcı."""

    queryset = Component.objects.all()
    serializer_class = ComponentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsCreatorOrReadOnly]


@extend_schema(tags=['Builds'])
class BuildListCreateView(generics.ListCreateAPIView):
    """GET: giriş yapan kullanıcının sistemleri. POST: yeni sistem ekler."""

    serializer_class = BuildSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Swagger şemayı oluştururken giriş yapılmış kullanıcı yoktur
        if getattr(self, 'swagger_fake_view', False):
            return SystemBuild.objects.none()
        return SystemBuild.objects.filter(owner=self.request.user).order_by('id')

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


@extend_schema(tags=['Builds'])
class BuildDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Tek sistem. Sadece sahibi görebilir, değiştirebilir, silebilir (başkası: 403)."""

    queryset = SystemBuild.objects.all()
    serializer_class = BuildSerializer
    permission_classes = [permissions.IsAuthenticated, IsBuildOwner]
