const API_BASE = (import.meta.env.VITE_API_URL || '') + '/api'

const BRANCH_SCOPED_PATHS = [
  'sales/sales',
  'purchases/purchases',
  'purchases/purchase-returns',
  'sales/sale-returns',
  'treasury/payments',
  'treasury/transfers',
  'treasury/cash-accounts',
  'treasury/advances',
  'accounting/journal-entries',
  'inventory/stock-movements',
  'inventory/product-serials',
  'inventory/product-costs',
  'maintenance/maintenance-orders',
]

function addBranchToPath(path: string, method: string): string {
  if (method !== 'GET') return path
  const norm = path.replace(/^\//, '')
  const isScoped = BRANCH_SCOPED_PATHS.some((p) => norm.startsWith(p))
  if (!isScoped) return path
  try {
    const stored = localStorage.getItem('erp_current_branch')
    if (!stored) return path
    const branchId = parseInt(stored, 10)
    if (isNaN(branchId)) return path
    const sep = path.includes('?') ? '&' : '?'
    return `${path}${sep}branch=${branchId}`
  } catch {
    return path
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('erp_auth')
  let parsed: { token?: string } = {}
  try {
    if (token) parsed = JSON.parse(token)
  } catch {}

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  }
  if (parsed.token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${parsed.token}`
  }

  const method = options.method || 'GET'
  const pathWithBranch = addBranchToPath(path, method)

  const res = await fetch(`${API_BASE}${pathWithBranch}`, { ...options, headers })
  const text = await res.text()
  let data: unknown
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    if (res.ok) throw new Error('استجابة غير صحيحة')
    throw new Error('تأكد أن الـ Backend يعمل: backend\\run.bat')
  }
  if (res.status === 401) {
    localStorage.removeItem('erp_auth')
    window.location.href = '/login'
    throw new Error('انتهت الجلسة')
  }
  if (!res.ok) {
    const err = data as Record<string, unknown>
    let msg = (typeof err?.detail === 'string' ? err.detail : null) || ''
    if (!msg && err && typeof err === 'object') {
      const parts: string[] = []
      for (const [k, v] of Object.entries(err)) {
        if (k === 'detail') continue
        if (Array.isArray(v)) parts.push(...(v as string[]))
        else if (typeof v === 'string') parts.push(v)
      }
      if (parts.length) msg = parts.join(' ')
    }
    throw new Error(msg || 'حدث خطأ')
  }
  return data as T
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
