from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AccountTypeViewSet, AccountViewSet, CostCenterViewSet, JournalEntryViewSet

router = DefaultRouter()
router.register('account-types', AccountTypeViewSet, basename='account-type')
router.register('accounts', AccountViewSet, basename='account')
router.register('cost-centers', CostCenterViewSet, basename='cost-center')
router.register('journal-entries', JournalEntryViewSet, basename='journal-entry')

urlpatterns = [
    path('', include(router.urls)),
]
