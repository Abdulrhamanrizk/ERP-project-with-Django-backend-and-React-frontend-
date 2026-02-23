from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from apps.core.mixins import BranchEnforcementMixin
from apps.core.permissions import CanManageTreasury, CanManageAdvances
from .models import CashAccount, Payment, Transfer, Advance
from .serializers import CashAccountSerializer, PaymentSerializer, TransferSerializer, AdvanceSerializer
from apps.accounting.services import create_payment_journal_entry, create_transfer_journal_entry


class CashAccountViewSet(BranchEnforcementMixin, viewsets.ModelViewSet):
    queryset = CashAccount.objects.select_related('branch', 'account').all()
    serializer_class = CashAccountSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        base = [IsAuthenticated()]
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return base + [CanManageTreasury()]
        return base
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['branch', 'account_type', 'is_active']


class PaymentViewSet(BranchEnforcementMixin, viewsets.ModelViewSet):
    queryset = Payment.objects.select_related('cash_account', 'branch', 'sale').all()
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        base = [IsAuthenticated()]
        if self.action in ('create', 'update', 'partial_update', 'destroy', 'post_entry'):
            return base + [CanManageTreasury()]
        return base
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['branch', 'payment_type', 'cash_account', 'payment_date']

    def _recalc_sale_if_receipt(self, payment):
        """إعادة حساب حالة السداد إذا كان السند قبض مرتبط بفاتورة مبيعات"""
        if payment.sale_id and payment.payment_type == 'receipt':
            from apps.sales.services import recalculate_sale_payment_status
            recalculate_sale_payment_status(payment.sale)

    def perform_create(self, serializer):
        self._validate_branch_before_save(serializer)
        self._validate_payment_cross_branch(serializer.validated_data)
        serializer.save()
        self._recalc_sale_if_receipt(serializer.instance)

    def _validate_payment_cross_branch(self, data, instance=None):
        """Block payment in branch A linked to sale/purchase in branch B."""
        from rest_framework.exceptions import ValidationError
        branch = data.get('branch') if data else None
        if branch is None and instance:
            branch = instance.branch
        if not branch:
            return
        branch_id = branch.id if hasattr(branch, 'id') else branch
        sale = data.get('sale') if data and 'sale' in data else (instance.sale if instance else None)
        if sale and getattr(sale, 'branch_id', None) != branch_id:
            raise ValidationError({'detail': 'فرع السند يجب أن يطابق فرع الفاتورة'})
        purchase = data.get('purchase') if data and 'purchase' in data else (instance.purchase if instance else None)
        if purchase and getattr(purchase, 'branch_id', None) != branch_id:
            raise ValidationError({'detail': 'فرع السند يجب أن يطابق فرع عملية الشراء'})

    def perform_update(self, serializer):
        self._validate_branch_before_save(serializer)
        self._validate_payment_cross_branch(serializer.validated_data, instance=serializer.instance)
        old_sale_id = serializer.instance.sale_id
        serializer.save()
        self._recalc_sale_if_receipt(serializer.instance)
        if old_sale_id and old_sale_id != serializer.instance.sale_id:
            from apps.sales.models import Sale
            try:
                old_sale = Sale.objects.get(id=old_sale_id)
                from apps.sales.services import recalculate_sale_payment_status
                recalculate_sale_payment_status(old_sale)
            except Sale.DoesNotExist:
                pass

    def perform_destroy(self, instance):
        sale_id = instance.sale_id
        instance.delete()
        if sale_id:
            from apps.sales.models import Sale
            from apps.sales.services import recalculate_sale_payment_status
            try:
                old_sale = Sale.objects.get(id=sale_id)
                recalculate_sale_payment_status(old_sale)
            except Sale.DoesNotExist:
                pass

    @action(detail=True, methods=['post'])
    def post_entry(self, request, pk=None):
        payment = self.get_object()
        if payment.is_posted:
            return Response({'detail': 'السند مرحّل مسبقاً'}, status=400)
        from apps.accounting.models import is_date_locked
        if is_date_locked(payment.branch.organization, payment.payment_date):
            return Response({'detail': 'الفترة المالية لهذا التاريخ مقفولة'}, status=400)
        create_payment_journal_entry(payment, user=request.user)
        self._recalc_sale_if_receipt(payment)
        return Response({'status': 'posted'})


class TransferViewSet(BranchEnforcementMixin, viewsets.ModelViewSet):
    queryset = Transfer.objects.select_related('from_account', 'to_account', 'branch').all()
    serializer_class = TransferSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        base = [IsAuthenticated()]
        if self.action in ('create', 'update', 'partial_update', 'destroy', 'post_entry'):
            return base + [CanManageTreasury()]
        return base
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['branch', 'transfer_date']

    @action(detail=True, methods=['post'])
    def post_entry(self, request, pk=None):
        transfer = self.get_object()
        if transfer.is_posted:
            return Response({'detail': 'التحويل مرحّل مسبقاً'}, status=400)
        from apps.accounting.models import is_date_locked
        if is_date_locked(transfer.branch.organization, transfer.transfer_date):
            return Response({'detail': 'الفترة المالية لهذا التاريخ مقفولة'}, status=400)
        create_transfer_journal_entry(transfer, user=request.user)
        return Response({'status': 'posted'})


class AdvanceViewSet(BranchEnforcementMixin, viewsets.ModelViewSet):
    queryset = Advance.objects.select_related('user', 'branch').all()
    serializer_class = AdvanceSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        base = [IsAuthenticated()]
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return base + [CanManageAdvances()]
        return base
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['branch', 'user', 'advance_type', 'is_settled']
