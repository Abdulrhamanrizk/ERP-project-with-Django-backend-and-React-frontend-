from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum
from django.utils import timezone
from datetime import timedelta

from apps.core.utils.branch_permissions import validate_and_get_branch_filter
from apps.sales.models import Sale, SaleItem
from apps.inventory.models import ProductCost


class SalesTrendView(APIView):
    """منحنى المبيعات حسب التاريخ"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        branch_filter, err = validate_and_get_branch_filter(request)
        if err:
            return err

        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        group_by = request.query_params.get('group_by', 'day')

        if not date_to:
            date_to = timezone.now().date()
        if not date_from:
            date_from = date_to - timedelta(days=30)

        qs = Sale.objects.filter(status='confirmed', sale_date__gte=date_from, sale_date__lte=date_to, **branch_filter)

        if group_by == 'month':
            from django.db.models.functions import TruncMonth
            rows = qs.annotate(period=TruncMonth('sale_date')).values('period').annotate(total=Sum('total')).order_by('period')
            data = [{'date': str(r['period'])[:7] if r['period'] else '', 'total': float(r['total'])} for r in rows]
        else:
            rows = qs.values('sale_date').annotate(total=Sum('total')).order_by('sale_date')
            data = [{'date': str(r['sale_date']), 'total': float(r['total'])} for r in rows]

        return Response({'data': data})


class TopProductsView(APIView):
    """أكثر المنتجات ربحاً"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        branch_filter, err = validate_and_get_branch_filter(request)
        if err:
            return err

        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        limit = int(request.query_params.get('limit', 10))

        if not date_to:
            date_to = timezone.now().date()
        if not date_from:
            date_from = date_to - timedelta(days=90)

        sales = Sale.objects.filter(status='confirmed', sale_date__gte=date_from, sale_date__lte=date_to, **branch_filter)

        items = SaleItem.objects.filter(sale__in=sales).select_related('product', 'sale')
        product_totals = {}
        for item in items:
            cost = ProductCost.objects.filter(product=item.product, branch=item.sale.branch).first()
            if not cost:
                cost = ProductCost.objects.filter(product=item.product, branch__isnull=True).first()
            actual_cost = float(cost.actual_cost) if cost else 0
            revenue = float(item.unit_price * item.quantity - item.discount)
            qty = float(item.quantity)
            cost_total = actual_cost * qty
            profit = revenue - cost_total
            key = item.product_id
            if key not in product_totals:
                product_totals[key] = {'product_name': item.product.name, 'revenue': 0, 'profit': 0, 'quantity': 0}
            product_totals[key]['revenue'] += revenue
            product_totals[key]['profit'] += profit
            product_totals[key]['quantity'] += qty

        sorted_products = sorted(product_totals.values(), key=lambda x: -x['profit'])[:limit]
        return Response({'data': sorted_products})
