from django.db import models
from apps.core.models import BaseModel


class ProductSerial(BaseModel):
    """Serial Number للمنتج"""
    product = models.ForeignKey(
        'inventory.Product',
        on_delete=models.CASCADE,
        related_name='serials',
        verbose_name='المنتج'
    )
    branch = models.ForeignKey(
        'core.Branch',
        on_delete=models.CASCADE,
        related_name='product_serials',
        verbose_name='الفرع'
    )
    serial_number = models.CharField(max_length=100)
    status = models.CharField(
        max_length=20,
        choices=[
            ('in_stock', 'في المخزون'),
            ('sold', 'مباع'),
            ('reserved', 'محجوز'),
            ('defective', 'معطل'),
        ],
        default='in_stock'
    )

    class Meta:
        db_table = 'product_serials'
        verbose_name = 'Serial'
        verbose_name_plural = 'Serial Numbers'
        unique_together = [['product', 'serial_number']]
        ordering = ['serial_number']

    def __str__(self):
        return f"{self.product.name} - {self.serial_number}"
