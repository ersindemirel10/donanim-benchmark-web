from django.contrib.auth import get_user_model
from django.db.models import Avg, Count, Max, Q
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import BenchmarkRun, Component, SystemBuild, TuningProfile
from .permissions import IsBuildOwner, IsCreatorOrReadOnly
from .serializers import (
    BuildSerializer, CompareSerializer, ComponentSerializer, ProfileSerializer, RegisterSerializer,
    RunSerializer, RunUpdateSerializer,
)
from .services import detect_throttle

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


def get_owned_build(request, build_id):
    """Adresteki sistemi getirir: yoksa 404, başkasınınsa 403."""
    build = get_object_or_404(SystemBuild, pk=build_id)
    if build.owner_id != request.user.id:
        raise PermissionDenied(IsBuildOwner.message)
    return build


@extend_schema(tags=['Profiles'])
class ProfileListCreateView(generics.ListCreateAPIView):
    """Bir sistemin ayar profilleri. GET: listele, POST: ekle (sadece sistemin sahibi)."""

    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return TuningProfile.objects.none()
        build = get_owned_build(self.request, self.kwargs['build_id'])
        return build.profiles.order_by('id')

    def perform_create(self, serializer):
        serializer.save(build=get_owned_build(self.request, self.kwargs['build_id']))


@extend_schema(tags=['Profiles'])
class ProfileDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Tek profil. Sadece profilin bağlı olduğu sistemin sahibi erişebilir."""

    queryset = TuningProfile.objects.select_related('build')
    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated, IsBuildOwner]


@extend_schema(tags=['Runs'])
class RunListCreateView(generics.ListCreateAPIView):
    """Bir sistemin benchmark sonuçları. GET: listele (yeniden eskiye), POST: ekle.
    POST sırasında termal darboğaz backend tarafından otomatik tespit edilir."""

    serializer_class = RunSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return BenchmarkRun.objects.none()
        build = get_owned_build(self.request, self.kwargs['build_id'])
        return build.runs.order_by('-id')

    def get_serializer_context(self):
        # Serializer, seçilen profilin bu sisteme ait olup olmadığını kontrol edebilsin
        context = super().get_serializer_context()
        if not getattr(self, 'swagger_fake_view', False):
            context['build'] = get_owned_build(self.request, self.kwargs['build_id'])
        return context

    def perform_create(self, serializer):
        build = get_owned_build(self.request, self.kwargs['build_id'])
        data = serializer.validated_data
        # throttled alanlarını kullanıcı değil backend belirler
        throttled, reason = detect_throttle(
            build, data.get('max_cpu_temp_c'), data.get('max_gpu_temp_c')
        )
        serializer.save(build=build, throttled=throttled, throttle_reason=reason)


@extend_schema(tags=['Runs'])
class RunDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Tek test sonucu. PUT/PATCH ile sadece 'notes' güncellenebilir."""

    queryset = BenchmarkRun.objects.select_related('build')
    permission_classes = [permissions.IsAuthenticated, IsBuildOwner]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return RunUpdateSerializer
        return RunSerializer


@extend_schema(
    tags=['Builds'],
    summary='Sistemin ayar profillerini kıyasla',
    responses={200: CompareSerializer},
)
class BuildCompareView(APIView):
    """Sistemdeki test sonuçlarını profile göre gruplar. Her profil için test sayısı,
    ortalama skor, en yüksek CPU/GPU sıcaklığı ve kaç testin throttle olduğunu verir.
    En yüksek ortalama skorlu profil en üstte gelir. Profilsiz testler ayrı bir satırdır."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, build_id):
        build = get_owned_build(request, build_id)
        rows = (
            build.runs.values('profile_id', 'profile__name')  # profile göre grupla
            .annotate(
                run_count=Count('id'),
                avg_score=Avg('score'),
                max_cpu_temp=Max('max_cpu_temp_c'),
                max_gpu_temp=Max('max_gpu_temp_c'),
                throttled_count=Count('id', filter=Q(throttled=True)),
            )
            .order_by('-avg_score')
        )
        data = {
            'build_id': build.id,
            'build_name': build.name,
            'rows': [
                {
                    'profile_id': r['profile_id'],
                    'profile_name': r['profile__name'],
                    'run_count': r['run_count'],
                    'avg_score': round(r['avg_score'], 2),
                    'max_cpu_temp': r['max_cpu_temp'],
                    'max_gpu_temp': r['max_gpu_temp'],
                    'throttled_count': r['throttled_count'],
                }
                for r in rows
            ],
        }
        return Response(CompareSerializer(data).data)
