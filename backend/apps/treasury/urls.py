from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CashAccountViewSet, PaymentViewSet, TransferViewSet, AdvanceViewSet

router = DefaultRouter()
router.register('cash-accounts', CashAccountViewSet, basename='cash-account')
router.register('payments', PaymentViewSet, basename='payment')
router.register('transfers', TransferViewSet, basename='transfer')
router.register('advances', AdvanceViewSet, basename='advance')

urlpatterns = [path('', include(router.urls))]
