from django.urls import path
from drf_spectacular.utils import extend_schema
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import (
    BuildCompareView, BuildDetailView, BuildListCreateView,
    ComponentDetailView, ComponentListCreateView,
    ProfileDetailView, ProfileListCreateView, RegisterView,
    RunDetailView, RunListCreateView,
)

LoginView = extend_schema(tags=['Auth'], summary='Giriş (JWT token al)')(TokenObtainPairView)
RefreshView = extend_schema(tags=['Auth'], summary='Access token yenile')(TokenRefreshView)

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/refresh/', RefreshView.as_view(), name='token-refresh'),
    path('components/', ComponentListCreateView.as_view(), name='component-list'),
    path('components/<int:pk>/', ComponentDetailView.as_view(), name='component-detail'),
    path('builds/', BuildListCreateView.as_view(), name='build-list'),
    path('builds/<int:pk>/', BuildDetailView.as_view(), name='build-detail'),
    path('builds/<int:build_id>/compare/', BuildCompareView.as_view(), name='build-compare'),
    path('builds/<int:build_id>/profiles/', ProfileListCreateView.as_view(), name='profile-list'),
    path('profiles/<int:pk>/', ProfileDetailView.as_view(), name='profile-detail'),
    path('builds/<int:build_id>/runs/', RunListCreateView.as_view(), name='run-list'),
    path('runs/<int:pk>/', RunDetailView.as_view(), name='run-detail'),
]
