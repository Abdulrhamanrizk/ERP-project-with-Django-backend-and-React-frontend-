from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction as db_transaction
from apps.core.mixins import BranchEnforcementMixin
from apps.core.permissions import CanManageSales, CanManageSaleReturns
from .models import Sale, SaleReturn
from .serializers import (
    SaleSerializer, SaleWriteSerializer,
    SaleReturnSerializer, SaleReturnWriteSerializer,
)
from .services import (
    validate_sale_stock, deduct_stock_for_sale,
    restore_stock_for_sale_return, validate_return_quantities,
    recalculate_sale_payment_status, create_cash_sale_receipt,
    create_cash_sale_return_payment,
)
from apps.accounting.services import (
    create_sale_journal_entry,
    create_sale_return_reversal_journal_entry,
)


class SaleViewSet(BranchEnforcementMixin, viewsets.ModelViewSet):
    queryset = Sale.objects.select_related('customer', 'branch').prefetch_related('items', 'items__product').all()
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        base = [IsAuthenticated()]
        if self.action in ('create', 'update', 'partial_update', 'confirm'):
            return base + [CanManageSales()]
        if self.action in ('create_return', 'returnable_items'):
            return base + [CanManageSaleReturns()]
        return base
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['branch', 'customer', 'status', 'payment_status', 'sale_date']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return SaleWriteSerializer
        return SaleSerializer

    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        sale = self.get_object()
        if sale.status == 'confirmed':
            return Response({'detail': 'الفاتورة مؤكدة مسبقاً'}, status=400)
        if sale.status == 'cancelled':
            return Response({'detail': 'لا يمكن تأكيد فاتورة ملغاة'}, status=400)

        from apps.accounting.models import is_date_locked
        if is_date_locked(sale.branch.organization, sale.sale_date):
            return Response({'detail': 'الفترة المالية لهذا التاريخ مقفولة'}, status=400)

        short = validate_sale_stock(sale, allow_negative=False)
        if short:
            msg = '; '.join(
                f"{s['product_name']}: طلب {s['requested']}، متوفر {s['available']}"
                for s in short
            )
            return Response({'detail': f'نقص في المخزون: {msg}'}, status=400)

        with db_transaction.atomic():
            sale.status = 'confirmed'
            sale.save(update_fields=['status'])
            deduct_stock_for_sale(sale, user=request.user)
            create_sale_journal_entry(sale, user=request.user)
            recalculate_sale_payment_status(sale)
            create_cash_sale_receipt(sale, user=request.user)

        return Response({'status': 'confirmed'})

    @action(detail=True, methods=['get'])
    def returnable_items(self, request, pk=None):
        """بنود الفاتورة مع الكمية القابلة للإرجاع"""
        sale = self.get_object()
        if sale.status != 'confirmed':
            return Response({'detail': 'الفاتورة غير مؤكدة'}, status=400)

        from .models import SaleReturnItem
        from django.db.models import Sum

        result = []
        for item in sale.items.select_related('product').all():
            returned = (
                SaleReturnItem.objects.filter(
                    sale_item=item,
                    sale_return__status='confirmed'
                )
                .aggregate(s=Sum('quantity'))['s'] or 0
            )
            available = float(item.quantity - returned)
            if available > 0:
                result.append({
                    'id': item.id,
                    'sale_item': item.id,
                    'product_id': item.product_id,
                    'product_name': item.product.name,
                    'quantity_sold': float(item.quantity),
                    'quantity_returned': float(returned),
                    'quantity_available': available,
                    'unit_price': float(item.unit_price),
                })
        return Response(result)

    @action(detail=True, methods=['post'])
    def create_return(self, request, pk=None):
        """إنشاء مرتجع من فاتورة مؤكدة"""
        sale = self.get_object()
        if sale.status != 'confirmed':
            return Response({'detail': 'يمكن إنشاء مرتجع من فاتورة مؤكدة فقط'}, status=400)
        if sale.status == 'cancelled':
            return Response({'detail': 'لا يمكن إنشاء مرتجع من فاتورة ملغاة'}, status=400)

        items_data = request.data.get('items', [])
        if not items_data:
            return Response({'detail': 'يجب تحديد بنود المرتجع'}, status=400)

        return_date = request.data.get('return_date') or str(sale.sale_date)
        notes = request.data.get('notes', '')

        with db_transaction.atomic():
            from .models import SaleReturn, SaleReturnItem
            from .serializers import get_next_return_number
            from decimal import Decimal

            return_obj = SaleReturn.objects.create(
                branch=sale.branch,
                sale=sale,
                return_number=get_next_return_number(),
                return_date=return_date,
                status='draft',
                notes=notes,
                created_by=request.user,
            )
            total = Decimal('0')
            for item_data in items_data:
                sale_item_id = item_data.get('sale_item')
                qty = Decimal(str(item_data.get('quantity', 0)))
                if not sale_item_id or qty <= 0:
                    continue
                sale_item = sale.items.get(id=sale_item_id)
                line_total = qty * sale_item.unit_price
                total += line_total
                SaleReturnItem.objects.create(
                    sale_return=return_obj,
                    sale_item=sale_item,
                    quantity=qty,
                    unit_price=sale_item.unit_price,
                    line_total=line_total,
                )
            return_obj.total = total
            return_obj.save(update_fields=['total'])

        ser = SaleReturnSerializer(return_obj)
        return Response(ser.data, status=201)


class SaleReturnViewSet(BranchEnforcementMixin, viewsets.ModelViewSet):
    queryset = SaleReturn.objects.select_related('sale', 'branch', 'sale__customer').prefetch_related('items', 'items__sale_item__product').all()
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        base = [IsAuthenticated()]
        if self.action in ('create', 'update', 'partial_update', 'confirm'):
            return base + [CanManageSaleReturns()]
        return base
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['branch', 'sale', 'status', 'return_date']

    def get_serializer_class(self):
        if self.action in ['create']:
            return SaleReturnWriteSerializer
        return SaleReturnSerializer

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
        if return_obj.sale.status != 'confirmed':
            return Response({'detail': 'الفاتورة الأصلية يجب أن تكون مؤكدة'}, status=400)
        from apps.accounting.models import is_date_locked
        if is_date_locked(return_obj.sale.branch.organization, return_obj.return_date):
            return Response({'detail': 'الفترة المالية لهذا التاريخ مقفولة'}, status=400)

        short = validate_return_quantities(return_obj)
        if short:
            msg = '; '.join(
                f"{s['product_name']}: طلب إرجاع {s['returned']}، أقصى مسموح {s['max_allowed']}"
                for s in short
            )
            return Response({'detail': f'تجاوز الكمية المباعة: {msg}'}, status=400)

        with db_transaction.atomic():
            return_obj.status = 'confirmed'
            return_obj.save(update_fields=['status'])
            restore_stock_for_sale_return(return_obj, user=request.user)
            create_sale_return_reversal_journal_entry(return_obj, user=request.user)
            recalculate_sale_payment_status(return_obj.sale)
            create_cash_sale_return_payment(return_obj, user=request.user)

        return Response({'status': 'confirmed'})
