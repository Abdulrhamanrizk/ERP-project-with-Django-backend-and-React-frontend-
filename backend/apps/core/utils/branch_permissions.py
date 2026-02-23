"""
Branch access policy and validation utilities.

Access rules:
- is_superuser: all branches (no restriction)
- role='manager' + organization: all branches in that organization
- else: branches from UserBranchAssignment only
- no assignments and not manager: empty (no branch access)
"""
from typing import Optional

from django.db.models import QuerySet

from apps.core.models import User, UserBranchAssignment, Branch


def get_user_allowed_branch_ids(user: User) -> Optional[list[int]]:
    """
    Return list of branch IDs the user can access.
    Returns None if user has unrestricted access (superuser).
    Returns [] if user has no branch access.
    """
    if not user or not user.is_authenticated:
        return []

    if user.is_superuser:
        return None  # None = all branches allowed

    # Manager role: all branches in user's organization
    if getattr(user, 'role', '') == 'manager' and user.organization_id:
        ids = list(
            Branch.objects.filter(organization_id=user.organization_id, is_active=True)
            .values_list('id', flat=True)
        )
        return ids if ids else []

    # From UserBranchAssignment
    ids = list(
        UserBranchAssignment.objects.filter(user=user)
        .values_list('branch_id', flat=True)
        .distinct()
    )
    return ids


def get_user_allowed_branches(user: User) -> Optional[QuerySet]:
    """Return Branch queryset or None (all)."""
    ids = get_user_allowed_branch_ids(user)
    if ids is None:
        return None
    return Branch.objects.filter(id__in=ids, is_active=True)


def validate_branch_access(user: User, branch_id: int):
    """
    Check if user can access the given branch.
    Returns (allowed: bool, error_message: str).
    """
    allowed_ids = get_user_allowed_branch_ids(user)
    if allowed_ids is None:
        return True, ""
    if branch_id in allowed_ids:
        return True, ""
    return False, "ليس لديك صلاحية الوصول لهذا الفرع"


def validate_and_get_branch_filter(request) -> tuple:
    """
    For report/API views that accept branch param and need to filter branch-scoped data.
    Returns (filter_kwargs, error_response).
    - If branch param present and user cannot access it: error_response is 403 Response.
    - filter_kwargs: use in .filter(**filter_kwargs) for models with branch_id.
    - If error_response is not None, return it from the view.
    """
    from rest_framework.response import Response
    from rest_framework import status

    branch_param = request.query_params.get('branch')
    if branch_param:
        try:
            bid = int(branch_param)
            allowed, msg = validate_branch_access(request.user, bid)
            if not allowed:
                return {}, Response({"detail": msg}, status=status.HTTP_403_FORBIDDEN)
        except (ValueError, TypeError):
            pass

    ids = get_user_allowed_branch_ids(request.user)
    if ids is None:
        return {}, None
    if not ids:
        return {'branch_id__in': []}, None
    if branch_param:
        try:
            bid = int(branch_param)
            if bid in ids:
                return {'branch_id__in': [bid]}, None
        except (ValueError, TypeError):
            pass
    return {'branch_id__in': ids}, None


def filter_queryset_by_branch_access(queryset: QuerySet, user: User, branch_field: str = "branch") -> QuerySet:
    """
    Filter queryset to only records in user's allowed branches.
    """
    allowed_ids = get_user_allowed_branch_ids(user)
    if allowed_ids is None:
        return queryset
    if not allowed_ids:
        return queryset.none()
    lookup = f"{branch_field}__id__in"
    return queryset.filter(**{lookup: allowed_ids})
