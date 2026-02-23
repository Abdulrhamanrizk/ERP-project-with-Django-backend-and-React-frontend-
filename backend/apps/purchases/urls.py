from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PurchaseViewSet, PurchaseReturnViewSet

router = DefaultRouter()
router.register('purchases', PurchaseViewSet, basename='purchase')
router.register('purchase-returns', PurchaseReturnViewSet, basename='purchase-return')

urlpatterns = [path('', include(router.urls))]
