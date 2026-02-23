import { useAuth } from '../store/AuthContext'
import { can, Permission } from '../utils/permissions'

export function usePermissions() {
  const { user } = useAuth()
  const role = user?.role ?? ''
  const isSuperuser = !!user?.is_superuser

  return {
    can: (permission: Permission) => can(role, permission, isSuperuser),
  }
}
