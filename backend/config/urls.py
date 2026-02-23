from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.core.urls.auth')),
    path('api/core/', include('apps.core.urls')),
    path('api/accounting/', include('apps.accounting.urls')),
    path('api/inventory/', include('apps.inventory.urls')),
    path('api/treasury/', include('apps.treasury.urls')),
    path('api/sales/', include('apps.sales.urls')),
    path('api/purchases/', include('apps.purchases.urls')),
    path('api/maintenance/', include('apps.maintenance.urls')),
    path('api/reports/', include('apps.reporting.urls')),
]
