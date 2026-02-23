from rest_framework import serializers
from django.db.models import Sum
from .models import CashAccount, Payment, Transfer, Advance


class CashAccountSerializer(serializers.ModelSerializer):
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    balance = serializers.SerializerMethodField()

    class Meta:
        model = CashAccount
        fields = ['id', 'branch', 'branch_name', 'account', 'name', 'account_type', 'bank_name', 'account_number', 'is_default', 'is_active', 'balance']

    def get_balance(self, obj):
        receipts = Payment.objects.filter(cash_account=obj, payment_type='receipt').aggregate(s=Sum('amount'))['s'] or 0
        payments = Payment.objects.filter(cash_account=obj, payment_type='payment').aggregate(s=Sum('amount'))['s'] or 0
        in_transfers = Transfer.objects.filter(to_account=obj).aggregate(s=Sum('amount'))['s'] or 0
        out_transfers = Transfer.objects.filter(from_account=obj).aggregate(s=Sum('amount'))['s'] or 0
        return float(receipts - payments + in_transfers - out_transfers)


class PaymentSerializer(serializers.ModelSerializer):
    cash_account_name = serializers.CharField(source='cash_account.name', read_only=True)
    party_name = serializers.SerializerMethodField()
    sale_number = serializers.SerializerMethodField()
    purchase_number = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = ['id', 'branch', 'cash_account', 'cash_account_name', 'party', 'party_name', 'sale', 'sale_number', 'purchase', 'purchase_number', 'payment_type', 'source_type', 'amount', 'payment_date', 'reference', 'description', 'is_posted']

    def get_party_name(self, obj):
        return obj.party.name if obj.party_id else None

    def get_sale_number(self, obj):
        return obj.sale.sale_number if obj.sale_id else None

    def get_purchase_number(self, obj):
        return obj.purchase.purchase_number if obj.purchase_id else None


class TransferSerializer(serializers.ModelSerializer):
    from_account_name = serializers.CharField(source='from_account.name', read_only=True)
    to_account_name = serializers.CharField(source='to_account.name', read_only=True)

    class Meta:
        model = Transfer
        fields = ['id', 'branch', 'from_account', 'to_account', 'from_account_name', 'to_account_name', 'amount', 'transfer_date', 'reference', 'notes', 'is_posted']


class AdvanceSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = Advance
        fields = ['id', 'branch', 'user', 'user_name', 'advance_type', 'amount', 'date', 'description', 'is_settled']
