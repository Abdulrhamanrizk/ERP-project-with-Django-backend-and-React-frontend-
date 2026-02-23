from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from apps.core.mixins import BranchEnforcementMixin
from apps.core.permissions import CanManageJournal
from .models import Account, AccountType, JournalEntry, JournalLine, CostCenter
from .serializers import (
    AccountSerializer,
    AccountTypeSerializer,
    JournalEntrySerializer,
    CostCenterSerializer,
)


class AccountTypeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AccountType.objects.all()
    serializer_class = AccountTypeSerializer
    permission_classes = [IsAuthenticated]


class AccountViewSet(viewsets.ModelViewSet):
    queryset = Account.objects.select_related('account_type', 'parent', 'organization').all()
    serializer_class = AccountSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['organization', 'account_type', 'is_active']


class CostCenterViewSet(viewsets.ModelViewSet):
    queryset = CostCenter.objects.filter(organization__isnull=False)
    serializer_class = CostCenterSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['organization', 'is_active']


class JournalEntryViewSet(BranchEnforcementMixin, viewsets.ModelViewSet):
    queryset = JournalEntry.objects.select_related('branch').prefetch_related('lines', 'lines__account').all()
    serializer_class = JournalEntrySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['branch', 'journal_type', 'entry_date', 'is_posted']

    def get_permissions(self):
        base = [IsAuthenticated()]
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return base + [CanManageJournal()]
        return base

    def perform_create(self, serializer):
        self._validate_branch_before_save(serializer)
        serializer.save(created_by=self.request.user)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.is_posted:
            from rest_framework.response import Response
            return Response(
                {'detail': 'لا يمكن تعديل قيد مرحّل. استخدم قيد عكسي للإلغاء.'},
                status=400
            )
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.is_posted:
            from rest_framework.response import Response
            return Response(
                {'detail': 'لا يمكن تعديل قيد مرحّل. استخدم قيد عكسي للإلغاء.'},
                status=400
            )
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.is_posted:
            from rest_framework.response import Response
            return Response(
                {'detail': 'لا يمكن حذف قيد مرحّل. استخدم قيد عكسي للإلغاء.'},
                status=400
            )
        return super().destroy(request, *args, **kwargs)
