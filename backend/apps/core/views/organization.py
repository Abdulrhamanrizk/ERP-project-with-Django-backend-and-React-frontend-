from decimal import Decimal
from datetime import date
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Sum
from apps.core.models import Organization, Party
from apps.core.serializers import OrganizationSerializer, PartySerializer


class OrganizationViewSet(viewsets.ModelViewSet):
    queryset = Organization.objects.all()
    serializer_class = OrganizationSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['is_active']


class PartyViewSet(viewsets.ModelViewSet):
    queryset = Party.objects.all()
    serializer_class = PartySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['organization', 'is_customer', 'is_supplier', 'is_active']

    @action(detail=True, methods=['get'])
    def ledger(self, request, pk=None):
        """كشف حساب الطرف: حركات ورصيد"""
        party = self.get_object()
        branch_id = request.query_params.get('branch')
        entries = []
        balance = Decimal('0')

        if party.is_customer:
            from apps.sales.models import Sale, SaleReturn
            from apps.treasury.models import Payment

            sales = Sale.objects.filter(customer=party, status='confirmed', payment_type='credit')
            if branch_id:
                sales = sales.filter(branch_id=branch_id)
            for s in sales.order_by('sale_date'):
                if s.total > 0:
                    entries.append({
                        'date': str(s.sale_date),
                        'doc_type': 'sale',
                        'doc_number': s.sale_number,
                        'description': f'فاتورة مبيعات {s.sale_number}',
                        'debit': float(s.total),
                        'credit': 0,
                        'balance': None,
                    })
                    balance += s.total

            receipts = Payment.objects.filter(party=party, payment_type='receipt', is_posted=True)
            if branch_id:
                receipts = receipts.filter(branch_id=branch_id)
            for r in receipts.order_by('payment_date'):
                entries.append({
                    'date': str(r.payment_date),
                    'doc_type': 'receipt',
                    'doc_number': r.reference or f'سند {r.id}',
                    'description': f'سند قبض - {r.sale.sale_number if r.sale_id else ""}',
                    'debit': 0,
                    'credit': float(r.amount),
                    'balance': None,
                })
                balance -= r.amount

            returns = SaleReturn.objects.filter(sale__customer=party, status='confirmed').select_related('sale')
            if branch_id:
                returns = returns.filter(branch_id=branch_id)
            for r in returns.order_by('return_date'):
                entries.append({
                    'date': str(r.return_date),
                    'doc_type': 'sale_return',
                    'doc_number': r.return_number,
                    'description': f'مرتجع مبيعات {r.return_number}',
                    'debit': 0,
                    'credit': float(r.total),
                    'balance': None,
                })
                balance -= r.total

        if party.is_supplier:
            from apps.purchases.models import Purchase, PurchaseReturn
            from apps.treasury.models import Payment

            purchases = Purchase.objects.filter(supplier=party, status='confirmed')
            if branch_id:
                purchases = purchases.filter(branch_id=branch_id)
            for p in purchases.order_by('purchase_date'):
                if p.total > 0:
                    entries.append({
                        'date': str(p.purchase_date),
                        'doc_type': 'purchase',
                        'doc_number': p.purchase_number,
                        'description': f'فاتورة مشتريات {p.purchase_number}',
                        'debit': 0,
                        'credit': float(p.total),
                        'balance': None,
                    })
                    balance += p.total

            payments = Payment.objects.filter(party=party, payment_type='payment', is_posted=True)
            if branch_id:
                payments = payments.filter(branch_id=branch_id)
            for p in payments.order_by('payment_date'):
                entries.append({
                    'date': str(p.payment_date),
                    'doc_type': 'payment',
                    'doc_number': p.reference or f'سند {p.id}',
                    'description': f'سند صرف - {p.purchase.purchase_number if p.purchase_id else ""}',
                    'debit': float(p.amount),
                    'credit': 0,
                    'balance': None,
                })
                balance -= p.amount

            returns = PurchaseReturn.objects.filter(purchase__supplier=party, status='confirmed').select_related('purchase')
            if branch_id:
                returns = returns.filter(branch_id=branch_id)
            for r in returns.order_by('return_date'):
                entries.append({
                    'date': str(r.return_date),
                    'doc_type': 'purchase_return',
                    'doc_number': r.return_number,
                    'description': f'مرتجع مشتريات {r.return_number}',
                    'debit': float(r.total),
                    'credit': 0,
                    'balance': None,
                })
                balance -= r.total

        entries.sort(key=lambda x: x['date'])
        running = Decimal('0')
        for e in entries:
            if party.is_customer:
                running += Decimal(str(e['debit'])) - Decimal(str(e['credit']))
            else:
                running += Decimal(str(e['credit'])) - Decimal(str(e['debit']))
            e['balance'] = float(running)

        return Response({
            'party': {'id': party.id, 'name': party.name, 'is_customer': party.is_customer, 'is_supplier': party.is_supplier},
            'entries': entries,
            'balance': float(balance),
        })
