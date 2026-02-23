from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import Organization, Branch, User, UserBranchAssignment, Party


@admin.register(Party)
class PartyAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'organization', 'is_customer', 'is_supplier', 'is_active']


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ['name', 'tax_id', 'is_active']


@admin.register(Branch)
class BranchAdmin(admin.ModelAdmin):
    list_display = ['name', 'organization', 'code', 'is_main', 'is_active']
    list_filter = ['organization', 'is_active']


@admin.register(UserBranchAssignment)
class UserBranchAssignmentAdmin(admin.ModelAdmin):
    list_display = ['user', 'branch', 'is_manager']


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['username', 'email', 'organization', 'default_branch', 'is_staff', 'is_active']
    list_filter = ['organization', 'is_staff', 'is_active']
    fieldsets = BaseUserAdmin.fieldsets + (
        (None, {'fields': ('organization', 'phone', 'default_branch', 'preferred_language')}),
    )
