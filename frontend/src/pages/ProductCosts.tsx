import { useState, useEffect } from 'react'
import Modal from '../components/Modal'
import { api } from '../api/client'

interface ProductCost {
  id: number
  product: number
  branch: number | null
  branch_name?: string
  purchase_price: string
  extra_expenses: string
  actual_cost: string
  selling_price: string
}

interface Branch {
  id: number
  name: string
  organization: number
}

interface ProductCostsModalProps {
  open: boolean
  onClose: () => void
  productId: number
  productName: string
  organizationId: number
  onSaved?: () => void
}

export default function ProductCostsModal({ open, onClose, productId, productName, organizationId, onSaved }: ProductCostsModalProps) {
  const [costs, setCosts] = useState<ProductCost[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    branch: '',
    purchase_price: '',
    extra_expenses: '0',
    selling_price: '',
  })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open || !productId) return
    setLoading(true)
    Promise.all([
      api.get<ProductCost[]>(`/inventory/product-costs/?product=${productId}`),
      api.get<{ results: Branch[] }>(`/core/branches/?organization=${organizationId}`),
    ])
      .then(([cRes, bRes]) => {
        setCosts(Array.isArray(cRes) ? cRes : (cRes as { results?: ProductCost[] }).results || [])
        setBranches(Array.isArray(bRes) ? bRes : (bRes as { results?: Branch[] }).results || [])
      })
      .catch(() => { setCosts([]); setBranches([]) })
      .finally(() => setLoading(false))
  }, [open, productId, organizationId])

  const calcProfit = (cost: ProductCost) => {
    const actual = parseFloat(cost.actual_cost || '0')
    const selling = parseFloat(cost.selling_price || '0')
    const margin = selling - actual
    const pct = actual > 0 ? ((margin / actual) * 100).toFixed(1) : '-'
    return { margin, pct }
  }

  const openAdd = () => {
    setEditingId(null)
    setForm({ branch: '', purchase_price: '', extra_expenses: '0', selling_price: '' })
    setShowForm(true)
  }

  const openEdit = (c: ProductCost) => {
    setEditingId(c.id)
    setForm({
      branch: String(c.branch || ''),
      purchase_price: c.purchase_price,
      extra_expenses: c.extra_expenses || '0',
      selling_price: c.selling_price,
    })
    setShowForm(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.branch || !form.purchase_price || !form.selling_price) return
    setSubmitting(true)
    const payload = {
      product: productId,
      branch: Number(form.branch),
      purchase_price: parseFloat(form.purchase_price),
      extra_expenses: parseFloat(form.extra_expenses) || 0,
      selling_price: parseFloat(form.selling_price),
    }
    const req = editingId
      ? api.patch(`/inventory/product-costs/${editingId}/`, payload)
      : api.post('/inventory/product-costs/', payload)
    req
      .then(() => {
        setShowForm(false)
        onSaved?.()
        api.get<ProductCost[]>(`/inventory/product-costs/?product=${productId}`)
          .then((r) => setCosts(Array.isArray(r) ? r : (r as { results?: ProductCost[] }).results || []))
      })
      .catch(() => {})
      .finally(() => setSubmitting(false))
  }

  const handleDelete = (id: number) => {
    if (!window.confirm('حذف هذا السعر؟')) return
    api.delete(`/inventory/product-costs/${id}/`).then(() => {
      setCosts(costs.filter((c) => c.id !== id))
      onSaved?.()
    }).catch(() => {})
  }

  if (!open) return null

  return (
    <Modal open={open} onClose={onClose} title={`أسعار وتكاليف: ${productName}`} wide>
      {loading ? (
        <p>جاري التحميل...</p>
      ) : (
        <>
          <div className="form-group">
            <button type="button" className="btn-add" onClick={openAdd}>إضافة سعر للفرع</button>
          </div>
          {showForm && (
            <form onSubmit={handleSubmit} style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: 8 }}>
              <h4 style={{ marginBottom: '0.75rem' }}>{editingId ? 'تعديل' : 'إضافة'}</h4>
              <div className="form-row">
                <div className="form-group">
                  <label>الفرع *</label>
                  <select value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} required disabled={!!editingId}>
                    <option value="">اختر</option>
                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>سعر الشراء *</label>
                  <input type="number" min="0" step="0.01" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>المصاريف الإضافية</label>
                  <input type="number" min="0" step="0.01" value={form.extra_expenses} onChange={(e) => setForm({ ...form, extra_expenses: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>سعر البيع *</label>
                  <input type="number" min="0" step="0.01" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: e.target.value })} required />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'حفظ...' : 'حفظ'}</button>
              </div>
            </form>
          )}
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>الفرع</th>
                  <th>سعر الشراء</th>
                  <th>المصاريف الإضافية</th>
                  <th>التكلفة الفعلية</th>
                  <th>سعر البيع</th>
                  <th>هامش الربح</th>
                  <th>نسبة الربح %</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {costs.map((c) => {
                  const { margin, pct } = calcProfit(c)
                  return (
                    <tr key={c.id}>
                      <td>{c.branch_name || '-'}</td>
                      <td>{c.purchase_price}</td>
                      <td>{c.extra_expenses || '0'}</td>
                      <td>{c.actual_cost}</td>
                      <td>{c.selling_price}</td>
                      <td>{margin.toFixed(2)}</td>
                      <td>{pct}%</td>
                      <td className="actions">
                        <button type="button" className="btn-icon" onClick={() => openEdit(c)} title="تعديل">✎</button>
                        <button type="button" className="btn-icon danger" onClick={() => handleDelete(c.id)} title="حذف">×</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {costs.length === 0 && !showForm && <p className="empty">لا توجد أسعار. أضف سعراً للفرع.</p>}
          </div>
        </>
      )}
    </Modal>
  )
}
