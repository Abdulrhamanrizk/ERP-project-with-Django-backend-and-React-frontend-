from django.db import models
from apps.core.models import BaseModel


class CostCenter(BaseModel):
    """مركز تكلفة"""
    organization = models.ForeignKey(
        'core.Organization',
        on_delete=models.CASCADE,
        related_name='cost_centers',
        verbose_name='المنظمة'
    )
    code = models.CharField(max_length=20)
    name = models.CharField(max_length=255)
    name_en = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'cost_centers'
        verbose_name = 'مركز تكلفة'
        verbose_name_plural = 'مراكز التكلفة'
        unique_together = [['organization', 'code']]
