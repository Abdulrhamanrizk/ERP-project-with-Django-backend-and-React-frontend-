from django.db import models
from apps.core.models import BaseModel


class AccountType(models.Model):
    """نوع الحساب: أصول، خصوم، حقوق ملكية، إيرادات، مصروفات"""
    code = models.CharField(max_length=10, unique=True)
    name = models.CharField(max_length=100)
    name_en = models.CharField(max_length=100, blank=True)
    natural_balance = models.CharField(max_length=1, choices=[('D', 'مدين'), ('C', 'دائن')])

    class Meta:
        db_table = 'account_types'
        verbose_name = 'نوع حساب'
        verbose_name_plural = 'أنواع الحسابات'

    def __str__(self):
        return self.name


class Account(BaseModel):
    """دليل الحسابات"""
    organization = models.ForeignKey(
        'core.Organization',
        on_delete=models.CASCADE,
        related_name='accounts',
        null=True,
        blank=True,
        verbose_name='المنظمة'
    )
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='children',
        verbose_name='الحساب الأب'
    )
    account_type = models.ForeignKey(
        AccountType,
        on_delete=models.PROTECT,
        related_name='accounts',
        verbose_name='نوع الحساب'
    )
    code = models.CharField(max_length=20)
    name = models.CharField(max_length=255)
    name_en = models.CharField(max_length=255, blank=True)
    is_system = models.BooleanField(default=False, verbose_name='حساب نظام')
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'accounts'
        verbose_name = 'حساب'
        verbose_name_plural = 'دليل الحسابات'
        unique_together = [['organization', 'code']]
        ordering = ['code']

    def __str__(self):
        return f"{self.code} - {self.name}"
