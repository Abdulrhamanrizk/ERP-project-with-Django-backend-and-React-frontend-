from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum
from django.utils import timezone
from datetime import timedelta

from apps.core.utils.branch_permissions import get_user_allowed_branch_ids, validate_and_get_branch_filter
from apps.inventory.models import Product, StockMovement
from apps.treasury.models import Payment, CashAccount, Transfer
from apps.accounting.models import JournalEntry
from apps.maintenance.models import MaintenanceOrder


class AlertsView(APIView):
    """تنبيهات تشغيلية: نقص مخزون، نقص سيولة، قيود غير مرحّلة، أوامر صيانة مفتوحة"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        branch_filter, err = validate_and_get_branch_filter(request)
        if err:
            return err

        alerts = []
        today = timezone.now().date()

        allowed_ids = get_user_allowed_branch_ids(request.user)
        if allowed_ids is not None and not allowed_ids:
            return Response({'alerts': [], 'count': 0})

        # 1. نقص مخزون: quantity < min_stock
        IN_TYPES = ['in', 'return_in']
        OUT_TYPES = ['out', 'return_out', 'transfer']
        for prod in Product.objects.filter(is_active=True, min_stock__gt=0).select_related('organization'):
            org = prod.organization
            if not org:
                continue
            branches_to_check = org.branches.filter(id__in=allowed_ids) if allowed_ids else org.branches.all()
            for branch in branches_to_check:
                incoming = StockMovement.objects.filter(
                    branch=branch, product=prod, movement_type__in=IN_TYPES
                ).aggregate(s=Sum('quantity'))['s'] or 0
                outgoing = StockMovement.objects.filter(
                    branch=branch, product=prod, movement_type__in=OUT_TYPES
                ).aggregate(s=Sum('quantity'))['s'] or 0
                stock = float(incoming - outgoing)
                if stock < float(prod.min_stock):
                    alerts.append({
                        'type': 'low_stock',
                        'priority': 'high',
                        'title': f'نقص مخزون: {prod.name}',
                        'description': f'الكمية الحالية {stock} أقل من الحد الأدنى {prod.min_stock} في فرع {branch.name}',
                        'link': f'/products?product={prod.id}',
                        'created_at': today.isoformat(),
                    })

        # 2. نقص سيولة: total_balance < 1000
        total_balance = 0
        for acc in CashAccount.objects.filter(is_active=True, **branch_filter):
            receipts = Payment.objects.filter(cash_account=acc, payment_type='receipt').aggregate(s=Sum('amount'))['s'] or 0
            payments = Payment.objects.filter(cash_account=acc, payment_type='payment').aggregate(s=Sum('amount'))['s'] or 0
            in_t = Transfer.objects.filter(to_account=acc).aggregate(s=Sum('amount'))['s'] or 0
            out_t = Transfer.objects.filter(from_account=acc).aggregate(s=Sum('amount'))['s'] or 0
            total_balance += float(receipts - payments + in_t - out_t)
        if total_balance < 1000:
            alerts.append({
                'type': 'low_liquidity',
                'priority': 'high',
                'title': 'نقص سيولة',
                'description': f'إجمالي الرصيد النقدي {total_balance:.0f} ج.م أقل من 1000 ج.م',
                'link': '/treasury',
                'created_at': today.isoformat(),
            })

        # 3. قيود غير مرحّلة
        unposted = JournalEntry.objects.filter(is_posted=False, **branch_filter).count()
        if unposted > 0:
            alerts.append({
                'type': 'unposted_journal',
                'priority': 'medium',
                'title': f'قيود غير مرحّلة ({unposted})',
                'description': f'يوجد {unposted} قيد يومي بانتظار الترحيل',
                'link': '/journal',
                'created_at': today.isoformat(),
            })

        # 4. أوامر صيانة مفتوحة منذ أكثر من 7 أيام
        cutoff = today - timedelta(days=7)
        old_open = MaintenanceOrder.objects.filter(status='open', created_at__date__lt=cutoff, **branch_filter)
        for order in old_open[:5]:
            alerts.append({
                'type': 'maintenance_open',
                'priority': 'low',
                'title': f'طلب صيانة مفتوح: {order.order_number}',
                'description': f'مفتوح منذ أكثر من 7 أيام - {order.customer_name}',
                'link': f'/maintenance',
                'created_at': order.created_at.date().isoformat() if order.created_at else today.isoformat(),
            })

        # ترتيب حسب الأولوية
        prio_order = {'high': 0, 'medium': 1, 'low': 2}
        alerts.sort(key=lambda a: prio_order.get(a['priority'], 3))

        return Response({'alerts': alerts, 'count': len(alerts)})
