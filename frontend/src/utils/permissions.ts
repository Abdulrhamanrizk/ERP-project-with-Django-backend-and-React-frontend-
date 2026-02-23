/**
 * Role-based permission checks (mirrors backend logic).
 * Manager + superuser = full access. Others = role-specific.
 */
type Role = 'manager' | 'accountant' | 'cashier' | 'warehouse' | ''

const PRIVILEGED: Role[] = ['manager']

function hasRole(userRole: Role, allowed: Role[]): boolean {
  if (userRole === 'manager') return true
  return allowed.includes(userRole)
}

export type Permission =
  | 'manage_sales'      // create/update/confirm sales
  | 'manage_sale_returns' // create/confirm sale returns
  | 'manage_purchases'  // create/update/confirm purchases + returns
  | 'manage_treasury'   // payments, transfers, post_entry
  | 'manage_advances'   // create/settle advances
  | 'manage_journal'    // create manual journal entries
  | 'manage_stock'      // create stock movements
  | 'manage_maintenance' // create/update maintenance orders

const PERMISSION_MATRIX: Record<Permission, Role[]> = {
  manage_sales: ['accountant', 'cashier'],
  manage_sale_returns: ['accountant'],
  manage_purchases: ['accountant', 'warehouse'],
  manage_treasury: ['accountant', 'cashier'],
  manage_advances: ['accountant', 'cashier'],
  manage_journal: ['accountant'],
  manage_stock: ['accountant', 'warehouse'],
  manage_maintenance: ['accountant', 'cashier', 'warehouse'],
}

export function can(
  role: string | undefined | null,
  permission: Permission,
  isSuperuser?: boolean
): boolean {
  if (isSuperuser) return true
  const r = (role || '').trim() as Role
  return hasRole(r, PRIVILEGED) || hasRole(r, PERMISSION_MATRIX[permission])
}
