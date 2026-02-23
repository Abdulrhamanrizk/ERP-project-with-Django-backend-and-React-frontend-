from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django_filters.rest_framework import DjangoFilterBackend
from apps.core.models import Branch
from apps.core.serializers import BranchSerializer
from apps.core.utils.branch_permissions import get_user_allowed_branch_ids, validate_branch_access


class BranchViewSet(viewsets.ModelViewSet):
    queryset = Branch.objects.select_related('organization').all()
    serializer_class = BranchSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['organization', 'is_active']

    def get_queryset(self):
        qs = super().get_queryset()
        ids = get_user_allowed_branch_ids(self.request.user)
        if ids is None:
            return qs
        if not ids:
            return qs.none()
        return qs.filter(id__in=ids)

    def list(self, request, *args, **kwargs):
        branch_id = request.query_params.get('branch')
        if branch_id:
            try:
                bid = int(branch_id)
                allowed, msg = validate_branch_access(request.user, bid)
                if not allowed:
                    return Response({"detail": msg}, status=status.HTTP_403_FORBIDDEN)
            except (ValueError, TypeError):
                pass
        return super().list(request, *args, **kwargs)
