from django.db import models
from decimal import Decimal
from apps.core.models import BaseModel


class Sale(BaseModel):
    """فاتورة مبيعات"""
    STATUS_CHOICES = [
        ('draft', 'مسودة'),
        ('confirmed', 'مؤكدة'),
        ('cancelled', 'ملغاة'),
    ]
    PAYMENT_STATUS_CHOICES = [
        ('unpaid', 'غير مسدد'),
        ('partial', 'مسدد جزئي'),
        ('paid', 'مسدد'),
    ]
    PAYMENT_TYPE_CHOICES = [
        ('credit', 'آجل'),
        ('cash', 'نقدي'),
    ]
    branch = models.ForeignKey(
        'core.Branch',
        on_delete=models.CASCADE,
        related_name='sales',
        verbose_name='الفرع'
    )
    customer = models.ForeignKey(
        'core.Party',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='sales',
        verbose_name='العميل'
    )
    sale_number = models.CharField(max_length=50, unique=True)
    sale_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    payment_type = models.CharField(max_length=20, choices=PAYMENT_TYPE_CHOICES, default='credit', verbose_name='نوع الدفع')
    cash_account = models.ForeignKey(
        'treasury.CashAccount',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cash_sales',
        verbose_name='حساب الخزينة (للبيع النقدي)'
    )
    total = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))
    discount = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))
    paid_amount = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'), verbose_name='المبلغ المدفوع')
    payment_status = models.CharField(
        max_length=20, choices=PAYMENT_STATUS_CHOICES, default='unpaid',
        verbose_name='حالة السداد'
    )
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        'core.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='sales_created'
    )

    class Meta:
        db_table = 'sales'
        verbose_name = 'فاتورة مبيعات'
        verbose_name_plural = 'فواتير المبيعات'
        ordering = ['-sale_date', '-id']


class SaleItem(BaseModel):
    """بند فاتورة مبيعات"""
    sale = models.ForeignKey(
        Sale,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name='الفاتورة'
    )
    product = models.ForeignKey(
        'inventory.Product',
        on_delete=models.PROTECT,
        related_name='sale_items',
        verbose_name='المنتج'
    )
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    unit_price = models.DecimalField(max_digits=15, decimal_places=2)
    discount = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))
    line_total = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))

    class Meta:
        db_table = 'sale_items'
        verbose_name = 'بند مبيعات'
        verbose_name_plural = 'بنود المبيعات'


class SaleReturn(BaseModel):
    """مرتجع مبيعات"""
    STATUS_CHOICES = [
        ('draft', 'مسودة'),
        ('confirmed', 'مؤكدة'),
        ('cancelled', 'ملغاة'),
    ]
    branch = models.ForeignKey(
        'core.Branch',
        on_delete=models.CASCADE,
        related_name='sale_returns',
        verbose_name='الفرع'
    )
    sale = models.ForeignKey(
        Sale,
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
        related_name='sale_returns_created'
    )

    class Meta:
        db_table = 'sale_returns'
        verbose_name = 'مرتجع مبيعات'
        verbose_name_plural = 'مرتجعات المبيعات'
        ordering = ['-return_date', '-id']


class SaleReturnItem(BaseModel):
    """بند مرتجع مبيعات"""
    sale_return = models.ForeignKey(
        SaleReturn,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name='المرتجع'
    )
    sale_item = models.ForeignKey(
        SaleItem,
        on_delete=models.PROTECT,
        related_name='return_items',
        verbose_name='بند الفاتورة الأصلية'
    )
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    unit_price = models.DecimalField(max_digits=15, decimal_places=2)
    line_total = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))

    class Meta:
        db_table = 'sale_return_items'
        verbose_name = 'بند مرتجع'
        verbose_name_plural = 'بنود المرتجعات'
