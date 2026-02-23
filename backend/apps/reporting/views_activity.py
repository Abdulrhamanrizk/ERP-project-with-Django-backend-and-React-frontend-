from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone

from apps.core.utils.branch_permissions import validate_and_get_branch_filter
from apps.sales.models import Sale
from apps.treasury.models import Payment
from apps.inventory.models import StockMovement


class ActivityTimelineView(APIView):
    """سجل النشاط المجمّع من المبيعات والمدفوعات وحركات المخزون"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        branch_filter, err = validate_and_get_branch_filter(request)
        if err:
            return err

        limit = int(request.query_params.get('limit', 50))

        activities = []

        for s in Sale.objects.filter(**branch_filter).select_related('branch', 'created_by').order_by('-created_at')[:limit]:
            activities.append({
                'type': 'sale',
                'title': f'فاتورة مبيعات {s.sale_number}',
                'description': f'{s.total} ج.م - {s.branch.name}',
                'date': s.created_at.isoformat() if s.created_at else s.sale_date.isoformat(),
                'link': '/sales',
                'user': s.created_by.first_name or s.created_by.username if s.created_by else '-',
            })

        type_label = {'receipt': 'قبض', 'payment': 'صرف'}
        for p in Payment.objects.filter(**branch_filter).select_related('cash_account', 'cash_account__branch', 'created_by').order_by('-created_at')[:limit]:
            activities.append({
                'type': 'payment',
                'title': f'سند {type_label.get(p.payment_type, p.payment_type)} - {p.reference or "-"}',
                'description': f'{p.amount} ج.م',
                'date': p.created_at.isoformat() if p.created_at else p.payment_date.isoformat(),
                'link': '/treasury',
                'user': p.created_by.first_name or p.created_by.username if p.created_by else '-',
            })

        for m in StockMovement.objects.filter(**branch_filter).select_related('product', 'branch', 'created_by').order_by('-created_at')[:limit]:
            activities.append({
                'type': 'stock',
                'title': f'حركة مخزون: {m.product.name}',
                'description': f'{m.movement_type} - {m.quantity}',
                'date': m.created_at.isoformat() if m.created_at else '',
                'link': '/warehouse',
                'user': m.created_by.first_name or m.created_by.username if m.created_by else '-',
            })

        activities.sort(key=lambda x: x['date'], reverse=True)
        return Response({'activities': activities[:limit]})
