from django.db import models
from .base import BaseModel


class UserBranchAssignment(BaseModel):
    """تعيين المستخدم للفروع التي يمكنه الوصول إليها"""
    user = models.ForeignKey(
        'core.User',
        on_delete=models.CASCADE,
        related_name='branch_assignments',
        verbose_name='المستخدم'
    )
    branch = models.ForeignKey(
        'core.Branch',
        on_delete=models.CASCADE,
        related_name='user_assignments',
        verbose_name='الفرع'
    )
    is_manager = models.BooleanField(default=False, verbose_name='مدير الفرع')

    class Meta:
        db_table = 'user_branch_assignments'
        verbose_name = 'تعيين فرع'
        verbose_name_plural = 'تعيينات الفروع'
        unique_together = [['user', 'branch']]
