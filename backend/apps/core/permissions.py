"""
Role-based permission classes for ERP actions.

Rules:
- is_superuser: full access
- role='manager': full access
- else: check role in allowed_roles
"""
from rest_framework.permissions import BasePermission

# Roles that always have full access (besides superuser)
PRIVILEGED_ROLES = ('manager',)

MESSAGE_FORBIDDEN = "ليس لديك صلاحية تنفيذ هذا الإجراء"


def _user_has_role(user, allowed_roles):
    """Check if user is privileged or has one of allowed_roles."""
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    role = (getattr(user, 'role', '') or '').strip()
    if role in PRIVILEGED_ROLES:
        return True
    return role in allowed_roles


class RoleRequired(BasePermission):
    """Base: allow if user has one of allowed_roles (or is superuser/manager)."""
    allowed_roles = ()
    message = MESSAGE_FORBIDDEN

    def has_permission(self, request, view):
        return _user_has_role(request.user, self.allowed_roles)


# --- Sales ---
class CanManageSales(RoleRequired):
    """Create/update sales, confirm sales."""
    allowed_roles = ('accountant', 'cashier')


class CanManageSaleReturns(RoleRequired):
    """Create and confirm sale returns."""
    allowed_roles = ('accountant',)


# --- Purchases ---
class CanManagePurchases(RoleRequired):
    """Create/update purchases, confirm, create_return, confirm return."""
    allowed_roles = ('accountant', 'warehouse')


# --- Treasury ---
class CanManageTreasury(RoleRequired):
    """Create payments/transfers, post_entry."""
    allowed_roles = ('accountant', 'cashier')


class CanManageAdvances(RoleRequired):
    """Create/settle advances."""
    allowed_roles = ('accountant', 'cashier')


# --- Accounting ---
class CanManageJournal(RoleRequired):
    """Create manual journal entries."""
    allowed_roles = ('accountant',)


# --- Inventory ---
class CanManageStock(RoleRequired):
    """Create stock movements."""
    allowed_roles = ('accountant', 'warehouse')


# --- Maintenance ---
class CanManageMaintenance(RoleRequired):
    """Create/update maintenance orders."""
    allowed_roles = ('accountant', 'cashier', 'warehouse')
