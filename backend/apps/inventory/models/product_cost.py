from django.db import models
from decimal import Decimal
from apps.core.models import BaseModel


class ProductCost(BaseModel):
    """تكلفة المنتج - سعر الشراء، مصاريف إضافية، تكلفة فعلية"""
    product = models.ForeignKey(
        'inventory.Product',
        on_delete=models.CASCADE,
        related_name='costs',
        verbose_name='المنتج'
    )
    branch = models.ForeignKey(
        'core.Branch',
        on_delete=models.CASCADE,
        related_name='product_costs',
        null=True,
        blank=True,
        verbose_name='الفرع'
    )
    purchase_price = models.DecimalField(
        max_digits=15, decimal_places=2, default=Decimal('0'),
        verbose_name='سعر الشراء'
    )
    extra_expenses = models.DecimalField(
        max_digits=15, decimal_places=2, default=Decimal('0'),
        verbose_name='المصاريف الإضافية'
    )
    actual_cost = models.DecimalField(
        max_digits=15, decimal_places=2, default=Decimal('0'),
        verbose_name='التكلفة الفعلية'
    )
    selling_price = models.DecimalField(
        max_digits=15, decimal_places=2, default=Decimal('0'),
        verbose_name='سعر البيع'
    )

    class Meta:
        db_table = 'product_costs'
        verbose_name = 'تكلفة منتج'
        verbose_name_plural = 'تكاليف المنتجات'
        unique_together = [['product', 'branch']]

    def save(self, *args, **kwargs):
        self.actual_cost = self.purchase_price + self.extra_expenses
        super().save(*args, **kwargs)
