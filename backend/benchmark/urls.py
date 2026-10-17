from django.urls import path
from drf_spectacular.utils import extend_schema
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import ComponentListCreateView, RegisterView

LoginView = extend_schema(tags=['Auth'], summary='Giriş (JWT token al)')(TokenObtainPairView)
RefreshView = extend_schema(tags=['Auth'], summary='Access token yenile')(TokenRefreshView)

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/refresh/', RefreshView.as_view(), name='token-refresh'),
    path('components/', ComponentListCreateView.as_view(), name='component-list'),
]
