"""
Reusable mixins for branch-scoped ViewSets.
"""
from rest_framework.response import Response
from rest_framework import status

from .utils.branch_permissions import (
    filter_queryset_by_branch_access,
    validate_branch_access,
    get_user_allowed_branch_ids,
)


class BranchEnforcementMixin:
    """
    Mixin for ViewSets with branch-scoped data.
    - Filters get_queryset() by user's allowed branches
    - Validates branch param in request (403 if outside allowed)
    - Validates branch on create/update in perform_create/perform_update
    """
    branch_field = "branch"
    branch_param = "branch"

    def get_queryset(self):
        qs = super().get_queryset()
        if hasattr(self, 'queryset') and qs is not None:
            qs = filter_queryset_by_branch_access(qs, self.request.user, self.branch_field)
        return qs

    def _check_branch_param(self, request):
        """If branch filter is in query params, validate user can access it."""
        branch_id = request.query_params.get(self.branch_param)
        if branch_id:
            try:
                bid = int(branch_id)
                allowed, msg = validate_branch_access(request.user, bid)
                if not allowed:
                    return Response({"detail": msg}, status=status.HTTP_403_FORBIDDEN)
            except (ValueError, TypeError):
                pass
        return None

    def list(self, request, *args, **kwargs):
        err = self._check_branch_param(request)
        if err:
            return err
        return super().list(request, *args, **kwargs)

    def _validate_branch_for_data(self, branch_id):
        """Validate branch_id is in user's allowed set. Returns Response or None."""
        if branch_id is None:
            return None
        allowed, msg = validate_branch_access(self.request.user, branch_id)
        if not allowed:
            return Response({"detail": msg}, status=status.HTTP_403_FORBIDDEN)
        return None

    def _validate_branch_before_save(self, serializer):
        """Call before serializer.save() in create/update. Raises PermissionDenied if branch not allowed."""
        from rest_framework.exceptions import PermissionDenied
        data = serializer.validated_data
        branch = data.get(self.branch_field)
        if branch:
            bid = branch.id if hasattr(branch, 'id') else branch
            allowed, msg = validate_branch_access(self.request.user, bid)
            if not allowed:
                raise PermissionDenied(msg)

    def perform_create(self, serializer):
        self._validate_branch_before_save(serializer)
        super().perform_create(serializer)

    def perform_update(self, serializer):
        self._validate_branch_before_save(serializer)
        super().perform_update(serializer)
