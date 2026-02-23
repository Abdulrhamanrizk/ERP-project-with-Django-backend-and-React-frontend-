from django.db import models
from .base import BaseModel


class Organization(BaseModel):
    """المنظمة/الشركة - Tenant في SaaS"""
    name = models.CharField(max_length=255, verbose_name='الاسم')
    name_en = models.CharField(max_length=255, blank=True, verbose_name='الاسم بالإنجليزية')
    tax_id = models.CharField(max_length=50, blank=True, verbose_name='الرقم الضريبي')
    address = models.TextField(blank=True, verbose_name='العنوان')
    phone = models.CharField(max_length=50, blank=True)
    email = models.EmailField(blank=True)
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        db_table = 'organizations'
        verbose_name = 'منظمة'
        verbose_name_plural = 'المنظمات'

    def __str__(self):
        return self.name
