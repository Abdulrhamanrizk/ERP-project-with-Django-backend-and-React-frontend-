from django.db import models
from decimal import Decimal
from apps.core.models import BaseModel


class Transfer(BaseModel):
    """تحويل بين حسابات خزينة"""
    branch = models.ForeignKey(
        'core.Branch',
        on_delete=models.CASCADE,
        related_name='transfers',
        verbose_name='الفرع'
    )
    from_account = models.ForeignKey(
        'treasury.CashAccount',
        on_delete=models.PROTECT,
        related_name='transfers_out',
        verbose_name='من حساب'
    )
    to_account = models.ForeignKey(
        'treasury.CashAccount',
        on_delete=models.PROTECT,
        related_name='transfers_in',
        verbose_name='إلى حساب'
    )
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    transfer_date = models.DateField()
    reference = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    is_posted = models.BooleanField(default=False)

    class Meta:
        db_table = 'transfers'
        verbose_name = 'تحويل'
        verbose_name_plural = 'التحويلات'
        ordering = ['-transfer_date', '-id']
