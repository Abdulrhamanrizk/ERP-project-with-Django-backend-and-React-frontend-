from django.db import models
from apps.core.models import BaseModel


class CashAccount(BaseModel):
    """حساب خزينة أو بنك"""
    ACCOUNT_TYPES = [
        ('cash', 'خزينة'),
        ('bank', 'بنك'),
    ]
    branch = models.ForeignKey(
        'core.Branch',
        on_delete=models.CASCADE,
        related_name='cash_accounts',
        verbose_name='الفرع'
    )
    account = models.ForeignKey(
        'accounting.Account',
        on_delete=models.PROTECT,
        related_name='cash_accounts',
        verbose_name='الحساب'
    )
    name = models.CharField(max_length=255)
    account_type = models.CharField(max_length=20, choices=ACCOUNT_TYPES)
    bank_name = models.CharField(max_length=255, blank=True)
    account_number = models.CharField(max_length=50, blank=True)
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'cash_accounts'
        verbose_name = 'حساب خزينة'
        verbose_name_plural = 'حسابات الخزينة'
        unique_together = [['branch', 'account']]
