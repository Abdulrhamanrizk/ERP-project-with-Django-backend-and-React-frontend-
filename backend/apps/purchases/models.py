from django.db import models
from decimal import Decimal
from apps.core.models import BaseModel


class Purchase(BaseModel):
    """فاتورة مشتريات"""
    STATUS_CHOICES = [
        ('draft', 'مسودة'),
        ('confirmed', 'مؤكدة'),
        ('cancelled', 'ملغاة'),
    ]
    branch = models.ForeignKey(
        'core.Branch',
        on_delete=models.CASCADE,
        related_name='purchases',
        verbose_name='الفرع'
    )
    supplier = models.ForeignKey(
        'core.Party',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='purchases',
        verbose_name='المورد'
    )
    purchase_number = models.CharField(max_length=50, unique=True)
    purchase_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    total = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))
    discount = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        'core.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='purchases_created'
    )

    class Meta:
        db_table = 'purchases'
        verbose_name = 'فاتورة مشتريات'
        verbose_name_plural = 'فواتير المشتريات'
        ordering = ['-purchase_date', '-id']


class PurchaseItem(BaseModel):
    """بند فاتورة مشتريات"""
    purchase = models.ForeignKey(
        Purchase,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name='الفاتورة'
    )
    product = models.ForeignKey(
        'inventory.Product',
        on_delete=models.PROTECT,
        related_name='purchase_items',
        verbose_name='المنتج'
    )
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    unit_price = models.DecimalField(max_digits=15, decimal_places=2)
    discount = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))
    line_total = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))

    class Meta:
        db_table = 'purchase_items'
        verbose_name = 'بند مشتريات'
        verbose_name_plural = 'بنود المشتريات'


class PurchaseReturn(BaseModel):
    """مرتجع مشتريات"""
    STATUS_CHOICES = [
        ('draft', 'مسودة'),
        ('confirmed', 'مؤكدة'),
        ('cancelled', 'ملغاة'),
    ]
    branch = models.ForeignKey(
        'core.Branch',
        on_delete=models.CASCADE,
        related_name='purchase_returns',
        verbose_name='الفرع'
    )
    purchase = models.ForeignKey(
        Purchase,
        on_delete=models.CASCADE,
        related_name='returns',
        verbose_name='الفاتورة الأصلية'
    )
    return_number = models.CharField(max_length=50, unique=True)
    return_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    total = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        'core.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='purchase_returns_created'
    )

    class Meta:
        db_table = 'purchase_returns'
        verbose_name = 'مرتجع مشتريات'
        verbose_name_plural = 'مرتجعات المشتريات'
        ordering = ['-return_date', '-id']


class PurchaseReturnItem(BaseModel):
    """بند مرتجع مشتريات"""
    purchase_return = models.ForeignKey(
        PurchaseReturn,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name='المرتجع'
    )
    purchase_item = models.ForeignKey(
        PurchaseItem,
        on_delete=models.PROTECT,
        related_name='return_items',
        verbose_name='بند الفاتورة الأصلية'
    )
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    unit_price = models.DecimalField(max_digits=15, decimal_places=2)
    line_total = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))

    class Meta:
        db_table = 'purchase_return_items'
        verbose_name = 'بند مرتجع مشتريات'
        verbose_name_plural = 'بنود مرتجعات المشتريات'
