from django.db import models
from django.db.models import Q
from decimal import Decimal
from apps.core.models import BaseModel


class Product(BaseModel):
    """المنتج"""
    organization = models.ForeignKey(
        'core.Organization',
        on_delete=models.CASCADE,
        related_name='products',
        verbose_name='المنظمة'
    )
    category = models.ForeignKey(
        'inventory.Category',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='products',
        verbose_name='الفئة'
    )
    sku = models.CharField(max_length=50, blank=True, verbose_name='الرمز')
    name = models.CharField(max_length=255)
    name_en = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    barcode = models.CharField(max_length=100, blank=True)
    unit = models.CharField(max_length=20, default='قطعة')
    track_serial = models.BooleanField(default=False, verbose_name='المنتج له رقم مسلسل')
    min_stock = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0'), verbose_name='حد إعادة الطلب')
    costing_method = models.CharField(
        max_length=20,
        choices=[
            ('FIFO', 'أول وارد أول صادر'),
            ('AVERAGE', 'المتوسط المرجح'),
        ],
        blank=True,
        verbose_name='طريقة التكلفة'
    )
    warranty_months = models.PositiveIntegerField(null=True, blank=True, verbose_name='مدة الضمان بالشهور')
    default_supplier = models.ForeignKey(
        'core.Party',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='default_products',
        verbose_name='المورد الافتراضي'
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'products'
        verbose_name = 'منتج'
        verbose_name_plural = 'المنتجات'
        unique_together = [['organization', 'sku']]
        ordering = ['name']
        constraints = [
            models.UniqueConstraint(
                fields=['barcode'],
                condition=~Q(barcode=''),
                name='product_barcode_unique_when_not_empty',
            ),
        ]

    def __str__(self):
        return f"{self.sku or '-'} - {self.name}"
