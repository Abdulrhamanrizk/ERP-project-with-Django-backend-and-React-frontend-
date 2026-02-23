from django.db import models
from django.db.models import Q
from apps.core.models import BaseModel


class Category(BaseModel):
    """فئة المنتجات"""
    organization = models.ForeignKey(
        'core.Organization',
        on_delete=models.CASCADE,
        related_name='product_categories',
        verbose_name='المنظمة'
    )
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='children',
        verbose_name='الفئة الأب'
    )
    name = models.CharField(max_length=255)
    name_en = models.CharField(max_length=255, blank=True)
    code = models.CharField(max_length=50, blank=True)
    description = models.TextField(blank=True)
    costing_method = models.CharField(
        max_length=20,
        choices=[
            ('FIFO', 'أول وارد أول صادر'),
            ('AVERAGE', 'المتوسط المرجح'),
        ],
        default='AVERAGE',
        blank=True,
        verbose_name='طريقة التكلفة'
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'categories'
        verbose_name = 'فئة'
        verbose_name_plural = 'فئات المنتجات'
        ordering = ['name']
        constraints = [
            models.UniqueConstraint(
                fields=['organization', 'code'],
                condition=~Q(code=''),
                name='category_org_code_unique_when_not_empty',
            ),
        ]

    def __str__(self):
        return self.name
