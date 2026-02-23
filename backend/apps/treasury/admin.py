from django.contrib import admin
from .models import CashAccount, Payment, Transfer, Advance


@admin.register(CashAccount)
class CashAccountAdmin(admin.ModelAdmin):
    list_display = ['name', 'branch', 'account_type', 'bank_name', 'is_default', 'is_active']


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['branch', 'payment_type', 'amount', 'payment_date', 'cash_account', 'is_posted']


@admin.register(Transfer)
class TransferAdmin(admin.ModelAdmin):
    list_display = ['branch', 'from_account', 'to_account', 'amount', 'transfer_date', 'is_posted']


@admin.register(Advance)
class AdvanceAdmin(admin.ModelAdmin):
    list_display = ['user', 'branch', 'advance_type', 'amount', 'date', 'is_settled']
