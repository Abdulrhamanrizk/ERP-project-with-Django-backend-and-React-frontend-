from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """مستخدم النظام"""
    ROLE_CHOICES = [
        ('', 'بدون'),
        ('manager', 'مدير'),
        ('accountant', 'محاسب'),
        ('cashier', 'كاشير'),
        ('warehouse', 'مخزن'),
    ]
    role = models.CharField(max_length=20, blank=True, default='', choices=ROLE_CHOICES, verbose_name='الدور')
    organization = models.ForeignKey(
        'core.Organization',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='users',
        verbose_name='المنظمة'
    )
    phone = models.CharField(max_length=50, blank=True)
    preferred_language = models.CharField(max_length=5, default='ar', choices=[('ar', 'العربية'), ('en', 'English')])
    default_branch = models.ForeignKey(
        'core.Branch',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='default_for_users',
        verbose_name='الفرع الافتراضي'
    )

    class Meta:
        db_table = 'users'
        verbose_name = 'مستخدم'
        verbose_name_plural = 'المستخدمون'
