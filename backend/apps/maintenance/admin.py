from django.contrib import admin
from .models import MaintenanceOrder


@admin.register(MaintenanceOrder)
class MaintenanceOrderAdmin(admin.ModelAdmin):
    list_display = ['order_number', 'customer_name', 'branch', 'status', 'created_at']
