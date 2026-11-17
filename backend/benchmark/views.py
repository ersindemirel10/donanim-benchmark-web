from django.contrib.auth import get_user_model
from django.db.models import Avg, Count, Max, Q
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import (
    OpenApiParameter, OpenApiResponse, extend_schema, extend_schema_view,
)
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import BenchmarkRun, BenchmarkSoftware, Component, SystemBuild, TuningProfile
from .permissions import IsBuildOwner, IsCreatorOrReadOnly
from .serializers import (
    BuildSerializer, ChangePasswordSerializer, CompareSerializer, ComponentSerializer,
    DeleteAccountSerializer, MeSerializer, MeUpdateSerializer,
    ProfileSerializer, RegisterSerializer,
    RunSerializer, RunUpdateSerializer, SoftwareSerializer,
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


_update_responses = {
    200: MeSerializer,
    400: OpenApiResponse(description='Doğrulama hatası'),
    409: OpenApiResponse(description='Kullanıcı adı veya e-posta başka bir hesapta kayıtlı'),
}


@extend_schema(tags=['Auth'])
@extend_schema_view(
    get=extend_schema(summary='Giriş yapan kullanıcının bilgileri'),
    put=extend_schema(
        summary='Hesap bilgilerini güncelle', request=MeUpdateSerializer, responses=_update_responses
    ),
    patch=extend_schema(
        summary='Hesap bilgilerini kısmen güncelle',
        request=MeUpdateSerializer,
        responses=_update_responses,
    ),
    delete=extend_schema(
        summary='Hesabı sil (şifre gerekir)',
        request=DeleteAccountSerializer,
        responses={
            204: None,
            400: OpenApiResponse(description='Şifre eksik veya yanlış'),
        },
    ),
)
class MeView(generics.RetrieveUpdateDestroyAPIView):
    """Giriş yapan kullanıcının kendi hesabı. GET: bilgiler. PUT/PATCH: kullanıcı adı ve e-posta.
    DELETE: hesabı siler. Frontend ayrıca sahiplik kontrolü için kullanıcı id'sini buradan alır."""

    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return MeUpdateSerializer
        return MeSerializer

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        user = self.get_object()
        username = request.data.get('username')
        email = request.data.get('email')
        # Kayıttaki gibi: başka bir hesapta varsa 409 (kendi mevcut değeri sorun değil)
        if username and User.objects.filter(username=username).exclude(pk=user.pk).exists():
            return Response(
                {'detail': 'Bu kullanıcı adı zaten kayıtlı.'}, status=status.HTTP_409_CONFLICT
            )
        if email and User.objects.filter(email__iexact=email).exclude(pk=user.pk).exists():
            return Response(
                {'detail': 'Bu e-posta zaten kayıtlı.'}, status=status.HTTP_409_CONFLICT
            )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        serializer = DeleteAccountSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = self.get_object()
        if not user.check_password(serializer.validated_data['password']):
            return Response(
                {'password': ['Şifre yanlış.']}, status=status.HTTP_400_BAD_REQUEST
            )
        # Kullanıcının sistemleri (profilleri ve testleriyle) silinir; parçaları ve
        # eklediği yazılımlar katalogda sahipsiz kalır (created_by SET_NULL).
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(
    tags=['Auth'],
    summary='Şifre değiştir',
    request=ChangePasswordSerializer,
    responses={
        200: OpenApiResponse(description='Şifre değiştirildi'),
        400: OpenApiResponse(description='Eski şifre yanlış veya yeni şifre geçersiz'),
    },
)
class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = request.user
        if not user.check_password(serializer.validated_data['old_password']):
            return Response(
                {'old_password': ['Eski şifre yanlış.']}, status=status.HTTP_400_BAD_REQUEST
            )
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        return Response({'detail': 'Şifre değiştirildi.'})


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

    @extend_schema(
        responses={
            204: None,
            403: OpenApiResponse(description='Parçayı sadece ekleyen kullanıcı silebilir'),
            409: OpenApiResponse(description='Parça bir veya daha fazla sistemde kullanılıyor'),
        }
    )
    def destroy(self, request, *args, **kwargs):
        # get_object() önce 404 / 403 kontrollerini yapar, 409 en son gelir
        component = self.get_object()
        if component.builds.exists():
            # Parça başka kullanıcıların sistemlerinde de olabilir, sessizce düşmesin
            return Response(
                {'detail': 'Bu parça bir veya daha fazla sistemde kullanılıyor, silinemez.'},
                status=status.HTTP_409_CONFLICT,
            )
        self.perform_destroy(component)
        return Response(status=status.HTTP_204_NO_CONTENT)


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


class OwnedBuildMixin:
    """Adresteki sistemi (build_id) istek başında bir kez kontrol eder: yoksa 404,
    başkasınınsa 403. Doğrulama (400) bundan sonra çalışır, bu yüzden başkasının
    sistemine hatalı veriyle istek atılsa bile cevap 403 olur."""

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)  # önce giriş (401) kontrolü
        self.build = get_owned_build(request, kwargs['build_id'])


@extend_schema(tags=['Profiles'])
class ProfileListCreateView(OwnedBuildMixin, generics.ListCreateAPIView):
    """Bir sistemin ayar profilleri. GET: listele, POST: ekle (sadece sistemin sahibi)."""

    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return TuningProfile.objects.none()
        return self.build.profiles.order_by('id')

    def perform_create(self, serializer):
        serializer.save(build=self.build)


@extend_schema(tags=['Profiles'])
class ProfileDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Tek profil. Sadece profilin bağlı olduğu sistemin sahibi erişebilir."""

    queryset = TuningProfile.objects.select_related('build')
    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated, IsBuildOwner]


@extend_schema(tags=['Runs'])
class RunListCreateView(OwnedBuildMixin, generics.ListCreateAPIView):
    """Bir sistemin benchmark sonuçları. GET: listele (yeniden eskiye), POST: ekle.
    POST sırasında termal darboğaz backend tarafından otomatik tespit edilir."""

    serializer_class = RunSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return BenchmarkRun.objects.none()
        return self.build.runs.order_by('-id')

    def get_serializer_context(self):
        # Serializer, seçilen profilin bu sisteme ait olup olmadığını kontrol edebilsin
        context = super().get_serializer_context()
        if not getattr(self, 'swagger_fake_view', False):
            context['build'] = self.build
        return context

    def perform_create(self, serializer):
        build = self.build
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


@extend_schema(tags=['Software'])
class SoftwareListCreateView(generics.ListCreateAPIView):
    """GET: benchmark yazılımlarını listeler (herkes). POST: yazılım ekler (giriş gerekir)."""

    queryset = BenchmarkSoftware.objects.all().order_by('name')
    serializer_class = SoftwareSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


@extend_schema(tags=['Software'])
class SoftwareDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET: tek yazılım. PUT/PATCH/DELETE: sadece yazılımı ekleyen kullanıcı."""

    queryset = BenchmarkSoftware.objects.all()
    serializer_class = SoftwareSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsCreatorOrReadOnly]

    @extend_schema(
        responses={
            204: None,
            403: OpenApiResponse(description='Yazılımı sadece ekleyen kullanıcı silebilir'),
            409: OpenApiResponse(description='Yazılım bir veya daha fazla test sonucunda kullanılıyor'),
        }
    )
    def destroy(self, request, *args, **kwargs):
        # get_object() önce 404 / 403 kontrollerini yapar, 409 en son gelir
        software = self.get_object()
        if software.runs.exists():
            return Response(
                {'detail': 'Bu yazılım bir veya daha fazla test sonucunda kullanılıyor, silinemez.'},
                status=status.HTTP_409_CONFLICT,
            )
        self.perform_destroy(software)
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(
    tags=['Builds'],
    summary='Sistemin ayar profillerini seçilen yazılım için kıyasla',
    parameters=[
        OpenApiParameter(
            'software', int, OpenApiParameter.QUERY, required=True,
            description='Kıyaslanacak benchmark yazılımının id değeri',
        ),
    ],
    responses={
        200: CompareSerializer,
        400: OpenApiResponse(description="'software' parametresi eksik veya geçersiz"),
        404: OpenApiResponse(description='Sistem veya yazılım bulunamadı'),
    },
)
class BuildCompareView(APIView):
    """Sistemdeki test sonuçlarını, seçilen yazılım için profile göre gruplar. Her profil için
    test sayısı, ortalama skor, en yüksek CPU/GPU sıcaklığı ve kaç testin throttle olduğunu verir.
    En yüksek ortalama skorlu profil en üstte gelir. Profilsiz testler ayrı bir satırdır.
    Farklı yazılımların skorları birbirine karıştırılmaz, bu yüzden yazılım seçmek zorunludur."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, build_id):
        build = get_owned_build(request, build_id)

        software_id = request.query_params.get('software')
        if not software_id or not software_id.isdigit():
            return Response(
                {'detail': "'software' parametresi zorunlu ve yazılım id'si olmalı. Örn: ?software=1"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        software = get_object_or_404(BenchmarkSoftware, pk=int(software_id))

        rows = (
            build.runs.filter(software=software)
            .values('profile_id', 'profile__name')  # profile göre grupla
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
            'software_id': software.id,
            'software_name': software.name,
            'score_unit': software.score_unit,
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
