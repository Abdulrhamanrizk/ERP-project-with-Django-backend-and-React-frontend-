from django.db import models
from decimal import Decimal
from apps.core.models import BaseModel


class StockMovement(BaseModel):
    """حركة مخزون"""
    MOVEMENT_TYPES = [
        ('in', 'إدخال'),
        ('out', 'إخراج'),
        ('transfer', 'تحويل'),
        ('adjust', 'تسوية'),
        ('return_in', 'مرتجع إدخال'),
        ('return_out', 'مرتجع إخراج'),
        ('opening_balance', 'رصيد افتتاحي'),
    ]
    branch = models.ForeignKey(
        'core.Branch',
        on_delete=models.CASCADE,
        related_name='stock_movements',
        verbose_name='الفرع'
    )
    product = models.ForeignKey(
        'inventory.Product',
        on_delete=models.PROTECT,
        related_name='stock_movements',
        verbose_name='المنتج'
    )
    movement_type = models.CharField(max_length=20, choices=MOVEMENT_TYPES)
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    reference = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        'core.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='stock_movements_created'
    )

    class Meta:
        db_table = 'stock_movements'
        verbose_name = 'حركة مخزون'
        verbose_name_plural = 'حركات المخزون'
        ordering = ['-created_at']
