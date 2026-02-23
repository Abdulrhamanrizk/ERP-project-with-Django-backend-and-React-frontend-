from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction as db_transaction
from django.db.models import Sum
from decimal import Decimal
from apps.core.mixins import BranchEnforcementMixin
from apps.core.permissions import CanManagePurchases
from .models import Purchase, PurchaseReturn, PurchaseReturnItem
from .serializers import (
    PurchaseSerializer, PurchaseWriteSerializer,
    PurchaseReturnSerializer, PurchaseReturnWriteSerializer,
)
from .services import (
    add_stock_for_purchase,
    deduct_stock_for_purchase_return,
    validate_purchase_return_quantities,
)
from apps.accounting.services import (
    create_purchase_journal_entry,
    create_purchase_return_reversal_journal_entry,
)


class PurchaseViewSet(BranchEnforcementMixin, viewsets.ModelViewSet):
    queryset = Purchase.objects.select_related('supplier', 'branch').prefetch_related('items', 'items__product').all()
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        base = [IsAuthenticated()]
        if self.action in ('create', 'update', 'partial_update', 'confirm', 'create_return', 'returnable_items'):
            return base + [CanManagePurchases()]
        return base
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['branch', 'supplier', 'status', 'purchase_date']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return PurchaseWriteSerializer
        return PurchaseSerializer

    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        purchase = self.get_object()
        if purchase.status == 'confirmed':
            return Response({'detail': 'الفاتورة مؤكدة مسبقاً'}, status=400)
        if purchase.status == 'cancelled':
            return Response({'detail': 'لا يمكن تأكيد فاتورة ملغاة'}, status=400)
        from apps.accounting.models import is_date_locked
        if is_date_locked(purchase.branch.organization, purchase.purchase_date):
            return Response({'detail': 'الفترة المالية لهذا التاريخ مقفولة'}, status=400)

        with db_transaction.atomic():
            purchase.status = 'confirmed'
            purchase.save(update_fields=['status'])
            add_stock_for_purchase(purchase, user=request.user)
            create_purchase_journal_entry(purchase, user=request.user)

        return Response({'status': 'confirmed'})

    @action(detail=True, methods=['get'])
    def returnable_items(self, request, pk=None):
        """بنود الفاتورة مع الكمية القابلة للإرجاع"""
        purchase = self.get_object()
        if purchase.status != 'confirmed':
            return Response({'detail': 'الفاتورة غير مؤكدة'}, status=400)

        result = []
        for item in purchase.items.select_related('product').all():
            returned = (
                PurchaseReturnItem.objects.filter(
                    purchase_item=item,
                    purchase_return__status='confirmed'
                )
                .aggregate(s=Sum('quantity'))['s'] or Decimal('0')
            )
            available = float(item.quantity - returned)
            if available > 0:
                result.append({
                    'id': item.id,
                    'purchase_item': item.id,
                    'product_id': item.product_id,
                    'product_name': item.product.name,
                    'quantity_purchased': float(item.quantity),
                    'quantity_returned': float(returned),
                    'quantity_available': available,
                    'unit_price': float(item.unit_price),
                })
        return Response(result)

    @action(detail=True, methods=['post'])
    def create_return(self, request, pk=None):
        """إنشاء مرتجع من فاتورة مؤكدة"""
        purchase = self.get_object()
        if purchase.status != 'confirmed':
            return Response({'detail': 'يمكن إنشاء مرتجع من فاتورة مؤكدة فقط'}, status=400)
        if purchase.status == 'cancelled':
            return Response({'detail': 'لا يمكن إنشاء مرتجع من فاتورة ملغاة'}, status=400)

        items_data = request.data.get('items', [])
        if not items_data:
            return Response({'detail': 'يجب تحديد بنود المرتجع'}, status=400)

        return_date = request.data.get('return_date') or str(purchase.purchase_date)
        notes = request.data.get('notes', '')

        with db_transaction.atomic():
            from .serializers import get_next_return_number

            return_obj = PurchaseReturn.objects.create(
                branch=purchase.branch,
                purchase=purchase,
                return_number=get_next_return_number(),
                return_date=return_date,
                status='draft',
                notes=notes,
                created_by=request.user,
            )
            total = Decimal('0')
            for item_data in items_data:
                purchase_item_id = item_data.get('purchase_item')
                qty = Decimal(str(item_data.get('quantity', 0)))
                if not purchase_item_id or qty <= 0:
                    continue
                purchase_item = purchase.items.get(id=purchase_item_id)
                line_total = qty * purchase_item.unit_price
                total += line_total
                PurchaseReturnItem.objects.create(
                    purchase_return=return_obj,
                    purchase_item=purchase_item,
                    quantity=qty,
                    unit_price=purchase_item.unit_price,
                    line_total=line_total,
                )
            return_obj.total = total
            return_obj.save(update_fields=['total'])

        ser = PurchaseReturnSerializer(return_obj)
        return Response(ser.data, status=201)


class PurchaseReturnViewSet(BranchEnforcementMixin, viewsets.ModelViewSet):
    queryset = PurchaseReturn.objects.select_related('purchase', 'branch', 'purchase__supplier').prefetch_related('items', 'items__purchase_item__product').all()
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        base = [IsAuthenticated()]
        if self.action in ('create', 'update', 'partial_update', 'confirm'):
            return base + [CanManagePurchases()]
        return base
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['branch', 'purchase', 'status', 'return_date']

    def get_serializer_class(self):
        if self.action == 'create':
            return PurchaseReturnWriteSerializer
        return PurchaseReturnSerializer

    def perform_create(self, serializer):
        self._validate_branch_before_save(serializer)
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        return_obj = self.get_object()
        if return_obj.status == 'confirmed':
            return Response({'detail': 'المرتجع مؤكد مسبقاً'}, status=400)
        if return_obj.status == 'cancelled':
            return Response({'detail': 'لا يمكن تأكيد مرتجع ملغى'}, status=400)
        if return_obj.purchase.status != 'confirmed':
            return Response({'detail': 'الفاتورة الأصلية يجب أن تكون مؤكدة'}, status=400)
        from apps.accounting.models import is_date_locked
        if is_date_locked(return_obj.purchase.branch.organization, return_obj.return_date):
            return Response({'detail': 'الفترة المالية لهذا التاريخ مقفولة'}, status=400)

        short = validate_purchase_return_quantities(return_obj)
        if short:
            msg = '; '.join(
                f"{s['product_name']}: {s.get('reason', f'طلب إرجاع {s['returned']}، أقصى مسموح {s['max_allowed']}')}"
                for s in short
            )
            return Response({'detail': f'خطأ في الكميات: {msg}'}, status=400)

        with db_transaction.atomic():
            return_obj.status = 'confirmed'
            return_obj.save(update_fields=['status'])
            deduct_stock_for_purchase_return(return_obj, user=request.user)
            create_purchase_return_reversal_journal_entry(return_obj, user=request.user)

        return Response({'status': 'confirmed'})
