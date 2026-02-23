from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum
from django.utils import timezone

from apps.core.utils.branch_permissions import validate_and_get_branch_filter
from apps.treasury.models import Payment, CashAccount, Transfer
from apps.sales.models import Sale
from apps.purchases.models import Purchase


class CashFlowSummaryView(APIView):
    """ملخص التدفق النقدي - الرصيد الحالي والتوقعات"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        branch_filter, err = validate_and_get_branch_filter(request)
        if err:
            return err

        today = timezone.now().date()

        total_balance = 0
        accounts_data = []
        for acc in CashAccount.objects.filter(is_active=True, **branch_filter).select_related('branch'):
            receipts = Payment.objects.filter(cash_account=acc, payment_type='receipt').aggregate(s=Sum('amount'))['s'] or 0
            payments = Payment.objects.filter(cash_account=acc, payment_type='payment').aggregate(s=Sum('amount'))['s'] or 0
            in_t = Transfer.objects.filter(to_account=acc).aggregate(s=Sum('amount'))['s'] or 0
            out_t = Transfer.objects.filter(from_account=acc).aggregate(s=Sum('amount'))['s'] or 0
            bal = float(receipts - payments + in_t - out_t)
            total_balance += bal
            accounts_data.append({'name': acc.name, 'balance': bal, 'branch': acc.branch.name})

        unpaid_sales = Sale.objects.filter(status='confirmed', **branch_filter).aggregate(s=Sum('total'))['s'] or 0
        unpaid_purchases = Purchase.objects.filter(status='confirmed', **branch_filter).aggregate(s=Sum('total'))['s'] or 0

        return Response({
            'total_balance': total_balance,
            'accounts': accounts_data,
            'expected_receipts': float(unpaid_sales),
            'expected_payments': float(unpaid_purchases),
            'alert_low_balance': total_balance < 1000,
        })
