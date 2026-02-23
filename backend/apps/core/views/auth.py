from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from apps.core.utils.branch_permissions import get_user_allowed_branch_ids


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        branch_ids = get_user_allowed_branch_ids(self.user)
        role = getattr(self.user, 'role', '') or ''
        # Superuser without explicit role → treat as manager for frontend
        if self.user.is_superuser and not role:
            role = 'manager'
        data['user'] = {
            'id': self.user.id,
            'username': self.user.username,
            'email': self.user.email,
            'first_name': self.user.first_name,
            'last_name': self.user.last_name,
            'organization_id': self.user.organization_id,
            'default_branch_id': self.user.default_branch_id,
            'preferred_language': self.user.preferred_language,
            'role': role,
            'is_superuser': self.user.is_superuser,
            'branch_ids': branch_ids if isinstance(branch_ids, list) else None,  # None = all branches
        }
        return data


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
