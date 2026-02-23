from django.db import models
from decimal import Decimal
from apps.core.models import BaseModel


class Payment(BaseModel):
    """U.O_U?U^O1O O U^U.U,O"U^O O O"""
    PAYMENT_TYPES = [
        ('receipt', 'U.U,O"U^O O O'),
        ('payment', 'U.O_U?U^O1O O'),
    ]
    SOURCE_TYPES = [
        ('customer', 'O1U.USU,'),
        ('supplier', 'U.U^OO_'),
        ('other', 'OOrOU%'),
    ]
    branch = models.ForeignKey(
        'core.Branch',
        on_delete=models.CASCADE,
        related_name='payments',
        verbose_name='O U,U?OO1'
    )
    cash_account = models.ForeignKey(
        'treasury.CashAccount',
        on_delete=models.PROTECT,
        related_name='payments',
        verbose_name='O-O3O O U,OrOUSU+c'
    )
    payment_type = models.CharField(max_length=20, choices=PAYMENT_TYPES)
    source_type = models.CharField(max_length=20, choices=SOURCE_TYPES, default='other')
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    payment_date = models.DateField()
    reference = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    is_posted = models.BooleanField(default=False)
    created_by = models.ForeignKey(
        'core.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='payments_created'
    )
    party = models.ForeignKey(
        'core.Party',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payments',
        verbose_name='Party'
    )
    sale = models.ForeignKey(
        'sales.Sale',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payments',
        verbose_name='Sale'
    )
    purchase = models.ForeignKey(
        'purchases.Purchase',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payments',
        verbose_name='Purchase'
    )

    class Meta:
        db_table = 'payments'
        verbose_name = 'O_U?O1/U.U,O"U^O '
        verbose_name_plural = 'O U,U.O_U?U^O1O O U^O U,U.U,O"U^O O O'
        ordering = ['-payment_date', '-id']
