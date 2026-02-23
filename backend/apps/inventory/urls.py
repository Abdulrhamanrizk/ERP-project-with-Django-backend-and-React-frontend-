from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CategoryViewSet, ProductViewSet, ProductSerialViewSet, ProductCostViewSet, StockMovementViewSet

router = DefaultRouter()
router.register('categories', CategoryViewSet, basename='category')
router.register('products', ProductViewSet, basename='product')
router.register('product-serials', ProductSerialViewSet, basename='product-serial')
router.register('product-costs', ProductCostViewSet, basename='product-cost')
router.register('stock-movements', StockMovementViewSet, basename='stock-movement')

urlpatterns = [path('', include(router.urls))]
