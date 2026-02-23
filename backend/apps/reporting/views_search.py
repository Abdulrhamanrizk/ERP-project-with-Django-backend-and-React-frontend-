"""بحث شامل - Command Palette"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q

from apps.core.utils.branch_permissions import validate_and_get_branch_filter
from apps.inventory.models import Product
from apps.core.models import Party
from apps.sales.models import Sale
from apps.purchases.models import Purchase


class GlobalSearchView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        branch_filter, err = validate_and_get_branch_filter(request)
        if err:
            return err

        q = (request.GET.get('q') or '').strip()
        limit = min(int(request.GET.get('limit', 5)), 10)

        if not q or len(q) < 2:
            return Response({
                'products': [],
                'parties': [],
                'sales': [],
                'purchases': [],
            })

        products = list(
            Product.objects.filter(
                Q(name__icontains=q) | Q(sku__icontains=q)
            ).values('id', 'name', 'sku')[:limit]
        )
        parties = list(
            Party.objects.filter(
                Q(name__icontains=q) | Q(code__icontains=q)
            ).values('id', 'name', 'code', 'is_customer', 'is_supplier')[:limit]
        )
        sales_qs = Sale.objects.filter(sale_number__icontains=q)[:limit]
        sales = [
            {
                'id': s.id,
                'sale_number': s.sale_number,
                'total': str(s.total),
                'sale_date': str(s.sale_date),
            }
            for s in sales_qs
        ]
        purchases_qs = Purchase.objects.filter(purchase_number__icontains=q, **branch_filter)[:limit]
        purchases = [
            {
                'id': p.id,
                'purchase_number': p.purchase_number,
                'total': str(p.total),
                'purchase_date': str(p.purchase_date),
            }
            for p in purchases_qs
        ]

        return Response({
            'products': products,
            'parties': parties,
            'sales': sales,
            'purchases': purchases,
        })
