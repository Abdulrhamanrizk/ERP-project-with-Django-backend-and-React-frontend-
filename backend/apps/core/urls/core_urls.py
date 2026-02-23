from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.core.views.organization import OrganizationViewSet, PartyViewSet
from apps.core.views.branch import BranchViewSet
from apps.core.views.user_list import UserListViewSet

router = DefaultRouter()
router.register('organizations', OrganizationViewSet, basename='organization')
router.register('branches', BranchViewSet, basename='branch')
router.register('parties', PartyViewSet, basename='party')
router.register('users', UserListViewSet, basename='user')

urlpatterns = [
    path('', include(router.urls)),
]
