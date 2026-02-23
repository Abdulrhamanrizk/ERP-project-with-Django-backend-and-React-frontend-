"""الفترات المالية وقفلها"""
from django.db import models
from apps.core.models import BaseModel


class FiscalPeriod(BaseModel):
    """فترة مالية"""
    organization = models.ForeignKey(
        'core.Organization',
        on_delete=models.CASCADE,
        related_name='fiscal_periods',
        verbose_name='المنظمة'
    )
    name = models.CharField(max_length=100, verbose_name='اسم الفترة')
    start_date = models.DateField(verbose_name='من تاريخ')
    end_date = models.DateField(verbose_name='إلى تاريخ')
    is_locked = models.BooleanField(default=False, verbose_name='مقفولة')

    class Meta:
        db_table = 'fiscal_periods'
        verbose_name = 'فترة مالية'
        verbose_name_plural = 'الفترات المالية'
        ordering = ['-start_date']

    def __str__(self):
        return f"{self.name} ({self.start_date} - {self.end_date})"


def is_date_locked(organization, check_date):
    """التحقق مما إذا كان التاريخ يقع ضمن فترة مقفولة.
    إذا لم توجد فترات، يُسمح بالتاريخ (لا قفل).
    """
    from django.db.models import Q
    locked = FiscalPeriod.objects.filter(
        organization=organization,
        is_locked=True,
        start_date__lte=check_date,
        end_date__gte=check_date
    ).exists()
    return locked
