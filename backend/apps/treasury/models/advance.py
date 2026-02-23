from django.db import models
from decimal import Decimal
from apps.core.models import BaseModel


class Advance(BaseModel):
    """عهد وسلف الموظفين"""
    TYPES = [
        ('advance', 'سلفة'),
        ('custody', 'عهدة'),
    ]
    branch = models.ForeignKey(
        'core.Branch',
        on_delete=models.CASCADE,
        related_name='advances',
        verbose_name='الفرع'
    )
    user = models.ForeignKey(
        'core.User',
        on_delete=models.CASCADE,
        related_name='advances',
        verbose_name='الموظف'
    )
    advance_type = models.CharField(max_length=20, choices=TYPES)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    date = models.DateField()
    description = models.TextField(blank=True)
    is_settled = models.BooleanField(default=False)
    settled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'advances'
        verbose_name = 'عهدة/سلفة'
        verbose_name_plural = 'العهد والسلف'
        ordering = ['-date', '-id']
