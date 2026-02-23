from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from apps.core.mixins import BranchEnforcementMixin
from apps.core.permissions import CanManageMaintenance
from .models import MaintenanceOrder
from .serializers import MaintenanceOrderSerializer


class MaintenanceOrderViewSet(BranchEnforcementMixin, viewsets.ModelViewSet):
    queryset = MaintenanceOrder.objects.select_related('branch').all()
    serializer_class = MaintenanceOrderSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        base = [IsAuthenticated()]
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return base + [CanManageMaintenance()]
        return base
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['branch', 'status']
