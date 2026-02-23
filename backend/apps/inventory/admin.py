from django.contrib import admin
from .models import Category, Product, ProductSerial, ProductCost, StockMovement


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'organization', 'is_active']


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['sku', 'name', 'category', 'organization', 'track_serial', 'is_active']


@admin.register(ProductSerial)
class ProductSerialAdmin(admin.ModelAdmin):
    list_display = ['product', 'serial_number', 'branch', 'status']


@admin.register(ProductCost)
class ProductCostAdmin(admin.ModelAdmin):
    list_display = ['product', 'branch', 'purchase_price', 'actual_cost', 'selling_price']


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ['product', 'branch', 'movement_type', 'quantity', 'created_at']
