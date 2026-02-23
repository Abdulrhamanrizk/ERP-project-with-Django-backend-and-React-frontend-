import { useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useBranch } from '../store/BranchContext'
import { usePermissions } from '../hooks/usePermissions'
import Modal from '../components/Modal'
import EmptyState from '../components/ui/EmptyState'
import { IconCreditCard, IconPlus } from '../components/icons'

interface Purchase {
  id: number
  purchase_number: string
  purchase_date: string
  supplier_name?: string
  total: string
  status: string
  stock_posted?: boolean
}

interface Branch {
  id: number
  name: string
  organization: number
}

interface Party {
  id: number
  name: string
}

interface Product {
  id: number
  name: string
  sku: string
  unit: string
}

interface PurchaseItemRow {
  product_id: string
  product_name: string
  quantity: string
  unit_price: string
  discount: string
}

interface ReturnableItem {
  purchase_item: number
  product_name: string
  quantity_purchased: number
  quantity_returned: number
  quantity_available: number
  unit_price: number
}

export default function Purchases() {
  const { currentBranchId } = useBranch()
  const { can } = usePermissions()
  const location = useLocation()
  const navigate = useNavigate()
  const [items, setItems] = useState<Purchase[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [suppliers, setSuppliers] = useState<Party[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    branch: '',
    supplier: '',
    purchase_date: new Date().toISOString().slice(0, 10),
    notes: '',
  })
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItemRow[]>([
    { product_id: '', product_name: '', quantity: '1', unit_price: '', discount: '0' },
  ])
  const [submitting, setSubmitting] = useState(false)
  const [confirmingId, setConfirmingId] = useState<number | null>(null)
  const [showReturnModal, setShowReturnModal] = useState(false)
  const [returnPurchase, setReturnPurchase] = useState<Purchase | null>(null)
  const [returnableItems, setReturnableItems] = useState<ReturnableItem[]>([])
  const [returnQtys, setReturnQtys] = useState<Record<number, string>>({})
  const [returnDate, setReturnDate] = useState(new Date().toISOString().slice(0, 10))
  const [returnNotes, setReturnNotes] = useState('')
  const [returnSubmitting, setReturnSubmitting] = useState(false)

  const load = useCallback(() => {
    api.get<{ results: Purchase[] }>('/purchases/purchases/')
      .then((res) => setItems(Array.isArray(res) ? res : (res as { results?: Purchase[] }).results || []))
      .catch((e) => setError(e instanceof Error ? e.message : 'خطأ'))
  }, [])

  const openReturnModal = useCallback((purchase: Purchase) => {
    setReturnPurchase(purchase)
    setReturnDate(new Date().toISOString().slice(0, 10))
    setReturnNotes('')
    setReturnQtys({})
    setShowReturnModal(true)
    api.get<ReturnableItem[]>(`/purchases/purchases/${purchase.id}/returnable_items/`)
      .then((res) => {
        const data = Array.isArray(res) ? res : []
        setReturnableItems(data)
        const initial: Record<number, string> = {}
        data.forEach((i) => { initial[i.purchase_item] = '0' })
        setReturnQtys(initial)
      })
      .catch(() => setReturnableItems([]))
  }, [])

  const handleReturnSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (!returnPurchase) return
    const items = returnableItems
      .filter((i) => {
        const q = parseFloat(returnQtys[i.purchase_item] || '0')
        return q > 0 && q <= i.quantity_available
      })
      .map((i) => ({
        purchase_item: i.purchase_item,
        quantity: parseFloat(returnQtys[i.purchase_item] || '0'),
      }))
    if (items.length === 0) return
    setReturnSubmitting(true)
    api.post(`/purchases/purchases/${returnPurchase.id}/create_return/`, {
      return_date: returnDate,
      notes: returnNotes,
      items,
    })
      .then((created: { id: number }) => api.post(`/purchases/purchase-returns/${created.id}/confirm/`))
      .then(() => {
        setShowReturnModal(false)
        setReturnPurchase(null)
        load()
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'فشل إنشاء المرتجع'))
      .finally(() => setReturnSubmitting(false))
  }, [returnPurchase, returnableItems, returnQtys, returnDate, returnNotes, load])

  const handleConfirm = useCallback((id: number) => {
    setConfirmingId(id)
    api.post(`/purchases/purchases/${id}/confirm/`)
      .then(() => load())
      .catch(() => {})
      .finally(() => setConfirmingId(null))
  }, [load])

  useEffect(() => {
    if ((location.state as { openAddModal?: boolean })?.openAddModal && can('manage_purchases')) {
      setShowModal(true)
      navigate(location.pathname, { replace: true })
    }
  }, [location.state, location.pathname, navigate, can])

  useEffect(() => {
    Promise.all([
      api.get<{ results: Purchase[] }>('/purchases/purchases/'),
      api.get<{ results: Branch[] }>('/core/branches/'),
    ])
      .then(([pRes, bRes]) => {
        setItems(Array.isArray(pRes) ? pRes : (pRes as { results?: Purchase[] }).results || [])
        setBranches(Array.isArray(bRes) ? bRes : (bRes as { results?: Branch[] }).results || [])
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'خطأ'))
      .finally(() => setLoading(false))
  }, [currentBranchId])

  const loadSuppliersAndProducts = useCallback((orgId: number) => {
    if (!orgId) return
    Promise.all([
      api.get<{ results: Party[] }>(`/core/parties/?is_supplier=true&organization=${orgId}`),
      api.get<{ results: Product[] }>(`/inventory/products/?organization=${orgId}`),
    ])
      .then(([sRes, pRes]) => {
        setSuppliers(Array.isArray(sRes) ? sRes : (sRes as { results?: Party[] }).results || [])
        setProducts(Array.isArray(pRes) ? pRes : (pRes as { results?: Product[] }).results || [])
      })
      .catch(() => { setSuppliers([]); setProducts([]) })
  }, [])

  const handleBranchChange = (branchId: string) => {
    setForm({ ...form, branch: branchId })
    const b = branches.find((x) => x.id === Number(branchId))
    if (b) loadSuppliersAndProducts(b.organization)
    else { setSuppliers([]); setProducts([]) }
  }

  const addItemRow = () => {
    setPurchaseItems([...purchaseItems, { product_id: '', product_name: '', quantity: '1', unit_price: '', discount: '0' }])
  }

  const removeItemRow = (idx: number) => {
    if (purchaseItems.length <= 1) return
    setPurchaseItems(purchaseItems.filter((_, i) => i !== idx))
  }

  const updateItem = (idx: number, field: keyof PurchaseItemRow, value: string) => {
    const next = [...purchaseItems]
    next[idx] = { ...next[idx], [field]: value }
    if (field === 'product_id') {
      const p = products.find((x) => x.id === Number(value))
      next[idx].product_name = p ? p.name : ''
    }
    setPurchaseItems(next)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.branch || purchaseItems.every((r) => !r.product_id || !r.quantity || !r.unit_price)) return
    setSubmitting(true)
    const itemsPayload = purchaseItems
      .filter((r) => r.product_id && r.quantity && r.unit_price)
      .map((r) => ({
        product: Number(r.product_id),
        quantity: parseFloat(r.quantity) || 0,
        unit_price: parseFloat(r.unit_price) || 0,
        discount: parseFloat(r.discount) || 0,
      }))
    if (itemsPayload.length === 0) {
      setSubmitting(false)
      return
    }
    api.post('/purchases/purchases/', {
      branch: Number(form.branch),
      supplier: form.supplier ? Number(form.supplier) : null,
      purchase_date: form.purchase_date,
      status: 'draft',
      discount: 0,
      notes: form.notes,
      items: itemsPayload,
    })
      .then(() => {
        setShowModal(false)
        setForm({ branch: '', supplier: '', purchase_date: new Date().toISOString().slice(0, 10), notes: '' })
        setPurchaseItems([{ product_id: '', product_name: '', quantity: '1', unit_price: '', discount: '0' }])
        load()
      })
      .catch(() => {})
      .finally(() => setSubmitting(false))
  }

  if (loading) return <div className="page">جاري التحميل...</div>
  if (error) return <div className="page error">{error}</div>

  const statusLabel: Record<string, string> = { draft: 'مسودة', confirmed: 'مؤكدة', cancelled: 'ملغاة' }

  return (
    <div className="page">
      <div className="page-actions">
        <h1>فواتير المشتريات</h1>
        {can('manage_purchases') && (
          <button type="button" className="btn-add" onClick={() => setShowModal(true)}>
            <IconPlus size={16} style={{ marginLeft: 6, verticalAlign: 'middle' }} />
            إضافة فاتورة مشتريات
          </button>
        )}
      </div>
      <Modal open={showModal} onClose={() => setShowModal(false)} title="إضافة فاتورة مشتريات" wide>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>الفرع *</label>
              <select value={form.branch} onChange={(e) => handleBranchChange(e.target.value)} required>
                <option value="">اختر الفرع</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>المورد</label>
              <select value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })}>
                <option value="">-- بدون --</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>التاريخ *</label>
              <input type="date" value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} required />
            </div>
          </div>
          <div className="form-group">
            <label>بنود الفاتورة</label>
            <div className="sale-items-table">
              <table>
                <thead>
                  <tr>
                    <th>المنتج</th>
                    <th>الكمية</th>
                    <th>سعر الوحدة</th>
                    <th>خصم</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseItems.map((row, idx) => (
                    <tr key={idx}>
                      <td>
                        <select
                          value={row.product_id}
                          onChange={(e) => updateItem(idx, 'product_id', e.target.value)}
                          required
                        >
                          <option value="">اختر</option>
                          {products.map((p) => <option key={p.id} value={p.id}>{p.name} {p.sku ? `(${p.sku})` : ''}</option>)}
                        </select>
                      </td>
                      <td><input type="number" min="0.01" step="0.01" value={row.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} /></td>
                      <td><input type="number" min="0" step="0.01" value={row.unit_price} onChange={(e) => updateItem(idx, 'unit_price', e.target.value)} /></td>
                      <td><input type="number" min="0" step="0.01" value={row.discount} onChange={(e) => updateItem(idx, 'discount', e.target.value)} /></td>
                      <td><button type="button" className="btn-icon" onClick={() => removeItemRow(idx)} title="حذف">×</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" className="btn-link" onClick={addItemRow}>+ إضافة بند</button>
          </div>
          <div className="form-group">
            <label>ملاحظات</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>إلغاء</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'جاري الحفظ...' : 'حفظ'}</button>
          </div>
        </form>
      </Modal>
      <Modal open={showReturnModal} onClose={() => setShowReturnModal(false)} title="إنشاء مرتجع مشتريات" wide>
        {returnPurchase && (
          <form onSubmit={handleReturnSubmit}>
            <p className="text-muted">فاتورة: {returnPurchase.purchase_number} - المورد: {returnPurchase.supplier_name || '-'}</p>
            <div className="form-row">
              <div className="form-group">
                <label>تاريخ المرتجع</label>
                <input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label>بنود المرتجع</label>
              <div className="sale-items-table">
                <table>
                  <thead>
                    <tr>
                      <th>المنتج</th>
                      <th>المشترى</th>
                      <th>المُرجع</th>
                      <th>المتبقي</th>
                      <th>كمية الإرجاع</th>
                      <th>السعر</th>
                    </tr>
                  </thead>
                  <tbody>
                    {returnableItems.map((i) => (
                      <tr key={i.purchase_item}>
                        <td>{i.product_name}</td>
                        <td>{i.quantity_purchased}</td>
                        <td>{i.quantity_returned}</td>
                        <td>{i.quantity_available}</td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            max={i.quantity_available}
                            step="0.01"
                            value={returnQtys[i.purchase_item] ?? '0'}
                            onChange={(e) => setReturnQtys({ ...returnQtys, [i.purchase_item]: e.target.value })}
                          />
                        </td>
                        <td>{i.unit_price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {returnableItems.length === 0 && <p className="text-muted">لا توجد بنود قابلة للإرجاع</p>}
            </div>
            <div className="form-group">
              <label>ملاحظات</label>
              <textarea value={returnNotes} onChange={(e) => setReturnNotes(e.target.value)} rows={2} />
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowReturnModal(false)}>إلغاء</button>
              <button type="submit" className="btn btn-primary" disabled={returnSubmitting || returnableItems.length === 0}>
                {returnSubmitting ? 'جاري الإنشاء والتأكيد...' : 'إنشاء وتأكيد المرتجع'}
              </button>
            </div>
          </form>
        )}
      </Modal>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>رقم الفاتورة</th>
              <th>التاريخ</th>
              <th>المورد</th>
              <th>الإجمالي</th>
              <th>الحالة</th>
              <th>إجراء</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id}>
                <td>{p.purchase_number}</td>
                <td>{p.purchase_date}</td>
                <td>{p.supplier_name || '-'}</td>
                <td>{p.total}</td>
                <td>
                  {statusLabel[p.status] || p.status}
                  {(p as Purchase).stock_posted && (
                    <span className="badge badge-paid" style={{ marginRight: 4 }} title="تم إثبات المخزون">مخزون</span>
                  )}
                </td>
                <td>
                  {p.status === 'draft' && can('manage_purchases') && (
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      disabled={confirmingId === p.id}
                      onClick={() => handleConfirm(p.id)}
                    >
                      {confirmingId === p.id ? 'جاري...' : 'تأكيد'}
                    </button>
                  )}
                  {p.status === 'confirmed' && can('manage_purchases') && (
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      onClick={() => openReturnModal(p)}
                      title="إنشاء مرتجع"
                    >
                      مرتجع
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <EmptyState
            icon={<IconCreditCard size={48} />}
            title="لا توجد فواتير مشتريات"
            description={can('manage_purchases') ? 'أضف أول فاتورة مشتريات' : 'تواصل مع المدير للحصول على صلاحية إضافة فواتير المشتريات'}
            action={can('manage_purchases') ? (
              <button type="button" className="btn-add" onClick={() => setShowModal(true)}>
                <IconPlus size={16} style={{ marginLeft: 6, verticalAlign: 'middle' }} />
                إضافة فاتورة مشتريات
              </button>
            ) : undefined}
          />
        )}
      </div>
    </div>
  )
}
