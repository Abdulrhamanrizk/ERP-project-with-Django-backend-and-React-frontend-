from django.db import models
from .base import BaseModel
from .organization import Organization


class Branch(BaseModel):
    """الفرع"""
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='branches',
        verbose_name='المنظمة'
    )
    name = models.CharField(max_length=255, verbose_name='الاسم')
    name_en = models.CharField(max_length=255, blank=True, verbose_name='الاسم بالإنجليزية')
    code = models.CharField(max_length=20, blank=True, verbose_name='الكود')
    address = models.TextField(blank=True, verbose_name='العنوان')
    phone = models.CharField(max_length=50, blank=True)
    is_main = models.BooleanField(default=False, verbose_name='فرع رئيسي')
    is_active = models.BooleanField(default=True, verbose_name='نشط')

    class Meta:
        db_table = 'branches'
        verbose_name = 'فرع'
        verbose_name_plural = 'الفروع'
        unique_together = [['organization', 'code']]

    def __str__(self):
        return f"{self.name} ({self.organization.name})"
