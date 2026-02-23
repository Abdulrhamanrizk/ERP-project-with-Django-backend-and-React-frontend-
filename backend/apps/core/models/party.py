from django.db import models
from .base import BaseModel


class Party(BaseModel):
    """طرف (عميل أو مورد)"""
    organization = models.ForeignKey(
        'core.Organization',
        on_delete=models.CASCADE,
        related_name='parties',
        verbose_name='المنظمة'
    )
    name = models.CharField(max_length=255)
    name_en = models.CharField(max_length=255, blank=True)
    code = models.CharField(max_length=50, blank=True)
    phone = models.CharField(max_length=50, blank=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    tax_id = models.CharField(max_length=50, blank=True)
    is_customer = models.BooleanField(default=True)
    is_supplier = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'parties'
        verbose_name = 'طرف'
        verbose_name_plural = 'الأطراف'
        ordering = ['name']

    def __str__(self):
        return self.name
