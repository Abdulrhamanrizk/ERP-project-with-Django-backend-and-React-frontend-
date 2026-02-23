from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from decimal import Decimal

from apps.core.utils.branch_permissions import validate_and_get_branch_filter
from apps.sales.models import Sale, SaleItem
from apps.inventory.models import ProductCost


class ProfitabilityReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        branch_filter, err = validate_and_get_branch_filter(request)
        if err:
            return err

        product_id = request.query_params.get('product')
        category_id = request.query_params.get('category')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')

        sales = Sale.objects.filter(status='confirmed', **branch_filter).select_related('branch')
        if date_from:
            sales = sales.filter(sale_date__gte=date_from)
        if date_to:
            sales = sales.filter(sale_date__lte=date_to)

        items = SaleItem.objects.filter(sale__in=sales).select_related('product', 'product__category', 'sale')
        if product_id:
            items = items.filter(product_id=product_id)
        if category_id:
            items = items.filter(product__category_id=category_id)

        rows = []
        for item in items:
            cost = ProductCost.objects.filter(
                product=item.product,
                branch=item.sale.branch
            ).first()
            if not cost:
                cost = ProductCost.objects.filter(product=item.product, branch__isnull=True).first()
            actual_cost = cost.actual_cost if cost else Decimal('0')
            qty = item.quantity
            revenue = item.unit_price * qty - item.discount
            cost_total = actual_cost * qty
            profit = revenue - cost_total
            rows.append({
                'product_id': item.product_id,
                'product_name': item.product.name,
                'category_name': item.product.category.name if item.product.category else '-',
                'branch_name': item.sale.branch.name,
                'sale_number': item.sale.sale_number,
                'quantity': float(qty),
                'revenue': float(revenue),
                'cost': float(cost_total),
                'profit': float(profit),
            })

        total_revenue = sum(r['revenue'] for r in rows)
        total_cost = sum(r['cost'] for r in rows)
        total_profit = sum(r['profit'] for r in rows)

        return Response({
            'rows': rows,
            'summary': {'total_revenue': total_revenue, 'total_cost': total_cost, 'total_profit': total_profit},
        })
