import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import { useBranch } from '../store/BranchContext'
import { usePermissions } from '../hooks/usePermissions'
import Modal from '../components/Modal'
import EmptyState from '../components/ui/EmptyState'
import { IconWarehouse } from '../components/icons'

interface StockMovement {
  id: number
  branch: number
  branch_name: string
  product: number
  product_name: string
  movement_type: string
  quantity: string
  reference: string
  notes: string
  created_at: string
}

interface Branch {
  id: number
  name: string
  organization: number
}

interface Product {
  id: number
  name: string
  sku: string
}

const IN_TYPES = ['in', 'return_in', 'opening_balance']
const OUT_TYPES = ['out', 'return_out', 'transfer']

const MOVEMENT_LABELS: Record<string, string> = {
  in: 'إدخال',
  out: 'إخراج',
  transfer: 'تحويل',
  adjust: 'تسوية',
  return_in: 'مرتجع إدخال',
  return_out: 'مرتجع إخراج',
  opening_balance: 'رصيد افتتاحي',
}

interface StockSummary {
  product: number
  product_name: string
  branch: number
  branch_name: string
  current_stock: number
}

function computeBalanceAfter(items: StockMovement[]): Map<number, number> {
  const balanceByKey: Record<string, number> = {}
  const sorted = [...items].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime() || a.id - b.id
  )
  const result = new Map<number, number>()
  for (const m of sorted) {
    const key = `${m.product}-${m.branch}`
    const prev = balanceByKey[key] ?? 0
    const qty = parseFloat(m.quantity)
    const delta = IN_TYPES.includes(m.movement_type)
      ? qty
      : OUT_TYPES.includes(m.movement_type)
        ? -qty
        : qty
    balanceByKey[key] = prev + delta
    result.set(m.id, balanceByKey[key])
  }
  return result
}

function computeStockSummary(items: StockMovement[]): StockSummary[] {
  const byKey: Record<string, { product: number; product_name: string; branch: number; branch_name: string; balance: number }> = {}
  for (const m of items) {
    const key = `${m.product}-${m.branch}`
    if (!byKey[key]) {
      byKey[key] = { product: m.product, product_name: m.product_name, branch: m.branch, branch_name: m.branch_name, balance: 0 }
    }
    const qty = parseFloat(m.quantity)
    const delta = IN_TYPES.includes(m.movement_type) ? qty : OUT_TYPES.includes(m.movement_type) ? -qty : qty
    byKey[key].balance += delta
  }
  return Object.values(byKey)
    .map((x) => ({ ...x, current_stock: x.balance }))
    .sort((a, b) => b.current_stock - a.current_stock)
}

export default function Warehouse() {
  const { currentBranchId } = useBranch()
  const { can } = usePermissions()
  const [items, setItems] = useState<StockMovement[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filterBranch, setFilterBranch] = useState('')
  const [form, setForm] = useState({
    branch: '',
    product: '',
    movement_type: 'in' as string,
    quantity: '',
    reference: '',
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(() => {
    const params = new URLSearchParams()
    if (filterBranch) params.set('branch', filterBranch)
    api.get<{ results: StockMovement[] }>(`/inventory/stock-movements/?${params}`)
      .then((res) => setItems(Array.isArray(res) ? res : (res as { results?: StockMovement[] }).results || []))
      .catch(() => setItems([]))
  }, [filterBranch])

  const loadProducts = useCallback((orgId: number) => {
    if (!orgId) return
    api.get<{ results: Product[] }>(`/inventory/products/?organization=${orgId}`)
      .then((res) => setProducts(Array.isArray(res) ? res : (res as { results?: Product[] }).results || []))
      .catch(() => setProducts([]))
  }, [])

  useEffect(() => {
    Promise.all([
      api.get<{ results: StockMovement[] }>('/inventory/stock-movements/'),
      api.get<{ results: Branch[] }>('/core/branches/'),
    ])
      .then(([mRes, bRes]) => {
        setItems(Array.isArray(mRes) ? mRes : (mRes as { results?: StockMovement[] }).results || [])
        setBranches(Array.isArray(bRes) ? bRes : (bRes as { results?: Branch[] }).results || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [currentBranchId])

  const handleBranchChange = (branchId: string) => {
    setForm({ ...form, branch: branchId, product: '' })
    const b = branches.find((x) => x.id === Number(branchId))
    if (b) loadProducts(b.organization)
    else setProducts([])
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.branch || !form.product || !form.quantity || parseFloat(form.quantity) <= 0) return
    setSubmitting(true)
    api.post('/inventory/stock-movements/', {
      branch: Number(form.branch),
      product: Number(form.product),
      movement_type: form.movement_type,
      quantity: parseFloat(form.quantity),
      reference: form.reference,
      notes: form.notes,
    })
      .then(() => {
        setShowModal(false)
        setForm({ branch: '', product: '', movement_type: 'in', quantity: '', reference: '', notes: '' })
        load()
      })
      .catch(() => {})
      .finally(() => setSubmitting(false))
  }

  useEffect(() => {
    if (!loading) load()
  }, [loading, load])

  const formatDate = (s: string) => {
    try {
      const d = new Date(s)
      return d.toLocaleDateString('ar-EG')
    } catch {
      return s
    }
  }

  if (loading) return <div className="page">جاري التحميل...</div>

  const balanceAfter = computeBalanceAfter(items)
  const stockSummary = computeStockSummary(items)

  return (
    <div className="page">
      <div className="page-actions">
        <h1>المخزن</h1>
        {can('manage_stock') && (
          <button type="button" className="btn-add" onClick={() => setShowModal(true)}>
            إضافة حركة مخزون
          </button>
        )}
      </div>

      <div className="form-row" style={{ marginBottom: '1rem', maxWidth: 300 }}>
        <div className="form-group">
          <label>تصفية بالفرع</label>
          <select value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)}>
            <option value="">الكل</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      {stockSummary.length > 0 && (
        <div className="table-wrap" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>رصيد المنتجات (الكمية الحالية)</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>المنتج</th>
                <th>الفرع</th>
                <th>الرصيد الحالي</th>
              </tr>
            </thead>
            <tbody>
              {stockSummary
                .filter((s) => !filterBranch || String(s.branch) === filterBranch)
                .map((s) => (
                  <tr key={`${s.product}-${s.branch}`}>
                    <td>{s.product_name}</td>
                    <td>{s.branch_name}</td>
                    <td><strong>{s.current_stock.toFixed(2)}</strong> قطعة</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      <h3 style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>حركات المخزون</h3>
      <Modal open={showModal} onClose={() => setShowModal(false)} title="إضافة حركة مخزون">
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>الفرع *</label>
              <select value={form.branch} onChange={(e) => handleBranchChange(e.target.value)} required>
                <option value="">اختر الفرع</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>المنتج *</label>
              <select value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} required disabled={!form.branch}>
                <option value="">اختر المنتج</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} {p.sku ? `(${p.sku})` : ''}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>نوع الحركة *</label>
              <select value={form.movement_type} onChange={(e) => setForm({ ...form, movement_type: e.target.value })} required>
                {Object.entries(MOVEMENT_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>الكمية *</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label>المرجع</label>
            <input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
          </div>
          <div className="form-group">
            <label>ملاحظات</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
              إلغاء
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'جاري الحفظ...' : 'حفظ'}
            </button>
          </div>
        </form>
      </Modal>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>التاريخ</th>
              <th>الفرع</th>
              <th>المنتج</th>
              <th>نوع الحركة</th>
              <th>الكمية</th>
              <th>الرصيد</th>
              <th>المرجع</th>
            </tr>
          </thead>
          <tbody>
            {[...items]
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .map((m) => (
                <tr key={m.id}>
                  <td>{formatDate(m.created_at)}</td>
                  <td>{m.branch_name}</td>
                  <td>{m.product_name}</td>
                  <td>{MOVEMENT_LABELS[m.movement_type] || m.movement_type}</td>
                  <td>{m.quantity}</td>
                  <td>{balanceAfter.get(m.id)?.toFixed(2) ?? '-'}</td>
                  <td>{m.reference || '-'}</td>
                </tr>
              ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <EmptyState
            icon={<IconWarehouse size={48} />}
            title="لا توجد حركات مخزون"
            description="سجل إدخال أو إخراج أو تحويل بين الفروع"
            action={can('manage_stock') ? <button type="button" className="btn-add" onClick={() => setShowModal(true)}>إضافة حركة</button> : undefined}
          />
        )}
      </div>
    </div>
  )
}
