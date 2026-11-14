from rest_framework import permissions

from .models import SystemBuild


class IsCreatorOrReadOnly(permissions.BasePermission):
    """Okuma herkese açık; değiştirme/silme sadece kaydı oluşturan kullanıcıya."""

    message = 'Bu kaydı sadece oluşturan kullanıcı değiştirebilir veya silebilir.'

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.created_by_id == request.user.id


class IsBuildOwner(permissions.BasePermission):
    """Sistem kişiseldir: okuma dahil her işlem sadece sahibine açık.
    Sisteme bağlı kayıtlarda (ayar profili, test sonucu) sahiplik, bağlı olduğu sistemden okunur."""

    message = 'Bu sistem size ait değil.'

    def has_object_permission(self, request, view, obj):
        build = obj if isinstance(obj, SystemBuild) else obj.build
        return build.owner_id == request.user.id
