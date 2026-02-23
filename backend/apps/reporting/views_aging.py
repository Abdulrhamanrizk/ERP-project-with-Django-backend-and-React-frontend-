"""تقرير Aging: مستحقات ومطلوبات حسب العمر"""
from decimal import Decimal
from datetime import date
from django.db.models import Sum
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.core.utils.branch_permissions import validate_and_get_branch_filter
from apps.core.models import Party
from apps.sales.models import Sale, SaleReturn
from apps.purchases.models import Purchase, PurchaseReturn
from apps.treasury.models import Payment


def _get_age_bucket(due_date, as_of):
    """تصنيف حسب العمر: current, 30, 60, 90, over90"""
    if due_date is None:
        return 'current'
    delta = (as_of - due_date).days
    if delta <= 0:
        return 'current'
    if delta <= 30:
        return '30'
    if delta <= 60:
        return '60'
    if delta <= 90:
        return '90'
    return 'over90'


class AgingReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        branch_filter, err = validate_and_get_branch_filter(request)
        if err:
            return err

        branch_id = request.query_params.get('branch')
        as_of_str = request.query_params.get('as_of') or str(date.today())
        try:
            as_of = date.fromisoformat(as_of_str)
        except ValueError:
            as_of = date.today()

        receivable = []
        payable = []

        customers = Party.objects.filter(is_customer=True, is_active=True)
        for p in customers:
            sales = Sale.objects.filter(customer=p, status='confirmed', payment_type='credit', **branch_filter)

            total_due = Decimal('0')
            buckets = {'current': Decimal('0'), '30': Decimal('0'), '60': Decimal('0'), '90': Decimal('0'), 'over90': Decimal('0')}

            for s in sales:
                returned = SaleReturn.objects.filter(sale=s, status='confirmed').aggregate(s=Sum('total'))['s'] or Decimal('0')
                net = s.total - returned
                paid = s.paid_amount or Decimal('0')
                due = net - paid
                if due <= 0:
                    continue
                total_due += due
                bucket = _get_age_bucket(s.sale_date, as_of)
                buckets[bucket] = buckets.get(bucket, Decimal('0')) + due

            if total_due > 0:
                receivable.append({
                    'party_id': p.id,
                    'party_name': p.name,
                    'total': float(total_due),
                    'current': float(buckets.get('current', 0)),
                    '30': float(buckets.get('30', 0)),
                    '60': float(buckets.get('60', 0)),
                    '90': float(buckets.get('90', 0)),
                    'over90': float(buckets.get('over90', 0)),
                })

        suppliers = Party.objects.filter(is_supplier=True, is_active=True)
        for p in suppliers:
            purchases = Purchase.objects.filter(supplier=p, status='confirmed', **branch_filter)

            total_due = Decimal('0')
            buckets = {'current': Decimal('0'), '30': Decimal('0'), '60': Decimal('0'), '90': Decimal('0'), 'over90': Decimal('0')}

            for pur in purchases:
                returned = PurchaseReturn.objects.filter(purchase=pur, status='confirmed').aggregate(s=Sum('total'))['s'] or Decimal('0')
                net = pur.total - returned
                paid = Payment.objects.filter(purchase=pur, payment_type='payment', is_posted=True).aggregate(s=Sum('amount'))['s'] or Decimal('0')
                due = net - paid
                if due <= 0:
                    continue
                total_due += due
                bucket = _get_age_bucket(pur.purchase_date, as_of)
                buckets[bucket] = buckets.get(bucket, Decimal('0')) + due

            if total_due > 0:
                payable.append({
                    'party_id': p.id,
                    'party_name': p.name,
                    'total': float(total_due),
                    'current': float(buckets.get('current', 0)),
                    '30': float(buckets.get('30', 0)),
                    '60': float(buckets.get('60', 0)),
                    '90': float(buckets.get('90', 0)),
                    'over90': float(buckets.get('over90', 0)),
                })

        return Response({
            'as_of': str(as_of),
            'branch_id': int(branch_id) if branch_id else None,
            'receivable': receivable,
            'payable': payable,
        })
