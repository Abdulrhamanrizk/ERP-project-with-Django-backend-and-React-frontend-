from django.db import models
from apps.core.models import BaseModel


class MaintenanceOrder(BaseModel):
    """أمر صيانة"""
    STATUS_CHOICES = [
        ('open', 'مفتوح'),
        ('in_progress', 'قيد التنفيذ'),
        ('done', 'منتهي'),
        ('cancelled', 'ملغى'),
    ]
    branch = models.ForeignKey(
        'core.Branch',
        on_delete=models.CASCADE,
        related_name='maintenance_orders',
        verbose_name='الفرع'
    )
    order_number = models.CharField(max_length=50, unique=True)
    customer_name = models.CharField(max_length=255)
    customer_phone = models.CharField(max_length=50, blank=True)
    device_description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    notes = models.TextField(blank=True)

    class Meta:
        db_table = 'maintenance_orders'
        verbose_name = 'أمر صيانة'
        verbose_name_plural = 'أوامر الصيانة'
        ordering = ['-created_at']
