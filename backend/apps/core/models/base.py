from django.db import models


class BaseModel(models.Model):
    """نموذج أساسي لجميع النماذج مع حقول التتبع المشتركة"""
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
