from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MaintenanceOrderViewSet

router = DefaultRouter()
router.register('maintenance-orders', MaintenanceOrderViewSet, basename='maintenance-order')

urlpatterns = [path('', include(router.urls))]
