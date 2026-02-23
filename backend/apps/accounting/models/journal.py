from django.db import models
from django.db.models import Sum
from decimal import Decimal
from apps.core.models import BaseModel


class JournalEntry(BaseModel):
    """قيد يومي"""
    JOURNAL_TYPES = [
        ('manual', 'يدوي'),
        ('auto', 'تلقائي'),
        ('compound', 'مركب'),
    ]
    branch = models.ForeignKey(
        'core.Branch',
        on_delete=models.CASCADE,
        related_name='journal_entries',
        verbose_name='الفرع'
    )
    entry_number = models.CharField(max_length=50, unique=True)
    entry_date = models.DateField()
    journal_type = models.CharField(max_length=20, choices=JOURNAL_TYPES, default='manual')
    description = models.TextField(blank=True)
    reference = models.CharField(max_length=100, blank=True)
    created_by = models.ForeignKey(
        'core.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='journal_entries_created'
    )
    is_posted = models.BooleanField(default=False)
    total_debit = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))
    total_credit = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))

    class Meta:
        db_table = 'journal_entries'
        verbose_name = 'قيد يومي'
        verbose_name_plural = 'القيود اليومية'
        ordering = ['-entry_date', '-id']

    def __str__(self):
        return f"{self.entry_number} - {self.entry_date}"

    def _recalculate_totals(self):
        agg = self.lines.aggregate(
            total_debit=Sum('debit'),
            total_credit=Sum('credit')
        )
        self.total_debit = agg['total_debit'] or Decimal('0')
        self.total_credit = agg['total_credit'] or Decimal('0')
        self.save(update_fields=['total_debit', 'total_credit'])


class JournalLine(BaseModel):
    """بند قيد"""
    journal_entry = models.ForeignKey(
        JournalEntry,
        on_delete=models.CASCADE,
        related_name='lines',
        verbose_name='القيد'
    )
    account = models.ForeignKey(
        'accounting.Account',
        on_delete=models.PROTECT,
        related_name='journal_lines',
        verbose_name='الحساب'
    )
    cost_center = models.ForeignKey(
        'accounting.CostCenter',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='journal_lines',
        verbose_name='مركز التكلفة'
    )
    debit = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))
    credit = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))
    description = models.CharField(max_length=255, blank=True)
    line_order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'journal_lines'
        verbose_name = 'بند قيد'
        verbose_name_plural = 'بنود القيود'
        ordering = ['line_order']
