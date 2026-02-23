import { useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useHotkeys } from 'react-hotkeys-hook'
import { api } from '../api/client'
import { useBranch } from '../store/BranchContext'
import { usePermissions } from '../hooks/usePermissions'
import Modal from '../components/Modal'
import EmptyState from '../components/ui/EmptyState'
import { IconShoppingCart, IconPlus } from '../components/icons'

interface Sale {
  id: number
  sale_number: string
  sale_date: string
  customer_name?: string
  total: string
  paid_amount?: string
  due_amount?: string
  status: string
  payment_type?: string
  payment_status?: string
}

interface CashAccount {
  id: number
  name: string
  branch: number
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

interface SaleItemRow {
  product_id: string
  product_name: string
  quantity: string
  unit_price: string
  discount: string
}

interface ReturnableItem {
  sale_item: number
  product_name: string
  quantity_sold: number
  quantity_returned: number
  quantity_available: number
  unit_price: number
}

export default function Sales() {
  const { currentBranchId } = useBranch()
  const { can } = usePermissions()
  const location = useLocation()
  const navigate = useNavigate()
  const [items, setItems] = useState<Sale[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [customers, setCustomers] = useState<Party[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    branch: '',
    customer: '',
    sale_date: new Date().toISOString().slice(0, 10),
    payment_type: 'credit' as 'credit' | 'cash',
    cash_account: '',
    notes: '',
  })
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('')
  const [cashAccounts, setCashAccounts] = useState<CashAccount[]>([])
  const [saleItems, setSaleItems] = useState<SaleItemRow[]>([
    { product_id: '', product_name: '', quantity: '1', unit_price: '', discount: '0' },
  ])
  const [submitting, setSubmitting] = useState(false)
  const [confirmingId, setConfirmingId] = useState<number | null>(null)
  const [showReturnModal, setShowReturnModal] = useState(false)
  const [returnSale, setReturnSale] = useState<Sale | null>(null)
  const [returnableItems, setReturnableItems] = useState<ReturnableItem[]>([])
  const [returnQtys, setReturnQtys] = useState<Record<number, string>>({})
  const [returnDate, setReturnDate] = useState(new Date().toISOString().slice(0, 10))
  const [returnNotes, setReturnNotes] = useState('')
  const [returnSubmitting, setReturnSubmitting] = useState(false)

  useHotkeys('ctrl+n', (e) => {
    if (can('manage_sales')) {
      e.preventDefault()
      setShowModal(true)
    }
  })

  const load = useCallback(() => {
    const params = paymentStatusFilter ? `?payment_status=${paymentStatusFilter}` : ''
    api.get<{ results: Sale[] }>(`/sales/sales/${params}`)
      .then((res) => setItems(Array.isArray(res) ? res : (res as { results?: Sale[] }).results || []))
      .catch((e) => setError(e instanceof Error ? e.message : 'خطأ'))
  }, [paymentStatusFilter])

  const openReturnModal = useCallback((sale: Sale) => {
    setReturnSale(sale)
    setReturnDate(new Date().toISOString().slice(0, 10))
    setReturnNotes('')
    setReturnQtys({})
    setShowReturnModal(true)
    api.get<ReturnableItem[]>(`/sales/sales/${sale.id}/returnable_items/`)
      .then((res) => {
        const items = Array.isArray(res) ? res : []
        setReturnableItems(items)
        const initial: Record<number, string> = {}
        items.forEach((i) => { initial[i.sale_item] = '0' })
        setReturnQtys(initial)
      })
      .catch(() => setReturnableItems([]))
  }, [])

  const handleReturnSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (!returnSale) return
    const items = returnableItems
      .filter((i) => {
        const q = parseFloat(returnQtys[i.sale_item] || '0')
        return q > 0 && q <= i.quantity_available
      })
      .map((i) => ({
        sale_item: i.sale_item,
        quantity: parseFloat(returnQtys[i.sale_item] || '0'),
      }))
    if (items.length === 0) {
      return
    }
    setReturnSubmitting(true)
    api.post(`/sales/sales/${returnSale.id}/create_return/`, {
      return_date: returnDate,
      notes: returnNotes,
      items,
    })
      .then((created: { id: number }) => {
        return api.post(`/sales/sale-returns/${created.id}/confirm/`)
      })
      .then(() => {
        setShowReturnModal(false)
        setReturnSale(null)
        load()
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'فشل إنشاء المرتجع'))
      .finally(() => setReturnSubmitting(false))
  }, [returnSale, returnableItems, returnQtys, returnDate, returnNotes, load])

  const handleConfirm = useCallback((id: number) => {
    setConfirmingId(id)
    api.post(`/sales/sales/${id}/confirm/`)
      .then(() => load())
      .catch((e) => setError(e instanceof Error ? e.message : 'فشل التأكيد'))
      .finally(() => setConfirmingId(null))
  }, [load])

  useEffect(() => {
    if ((location.state as { openAddModal?: boolean })?.openAddModal && can('manage_sales')) {
      setShowModal(true)
      navigate(location.pathname, { replace: true })
    }
  }, [location.state, location.pathname, navigate, can])

  useEffect(() => {
    const salesUrl = paymentStatusFilter ? `/sales/sales/?payment_status=${paymentStatusFilter}` : '/sales/sales/'
    Promise.all([
      api.get<{ results: Sale[] }>(salesUrl),
      api.get<{ results: Branch[] }>('/core/branches/'),
    ])
      .then(([sRes, bRes]) => {
        setItems(Array.isArray(sRes) ? sRes : (sRes as { results?: Sale[] }).results || [])
        setBranches(Array.isArray(bRes) ? bRes : (bRes as { results?: Branch[] }).results || [])
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'خطأ'))
      .finally(() => setLoading(false))
  }, [paymentStatusFilter, currentBranchId])

  const loadCustomersProductsAccounts = useCallback((orgId: number, branchId: string) => {
    if (!orgId) return
    const reqs: Promise<unknown>[] = [
      api.get<{ results: Party[] }>(`/core/parties/?is_customer=true&organization=${orgId}`),
      api.get<{ results: Product[] }>(`/inventory/products/?organization=${orgId}`),
    ]
    if (branchId) {
      reqs.push(api.get<{ results: CashAccount[] }>(`/treasury/cash-accounts/?branch=${branchId}&is_active=true`))
    }
    Promise.all(reqs)
      .then((results) => {
        setCustomers(Array.isArray(results[0]) ? results[0] : (results[0] as { results?: Party[] })?.results || [])
        setProducts(Array.isArray(results[1]) ? results[1] : (results[1] as { results?: Product[] })?.results || [])
        if (results[2]) {
          setCashAccounts(Array.isArray(results[2]) ? results[2] : (results[2] as { results?: CashAccount[] })?.results || [])
        } else {
          setCashAccounts([])
        }
      })
      .catch(() => { setCustomers([]); setProducts([]); setCashAccounts([]) })
  }, [])

  const handleBranchChange = (branchId: string) => {
    setForm({ ...form, branch: branchId, cash_account: '' })
    const b = branches.find((x) => x.id === Number(branchId))
    if (b) loadCustomersProductsAccounts(b.organization, branchId)
    else { setCustomers([]); setProducts([]); setCashAccounts([]) }
  }

  const addItemRow = () => {
    setSaleItems([...saleItems, { product_id: '', product_name: '', quantity: '1', unit_price: '', discount: '0' }])
  }

  const removeItemRow = (idx: number) => {
    if (saleItems.length <= 1) return
    setSaleItems(saleItems.filter((_, i) => i !== idx))
  }

  const updateItem = (idx: number, field: keyof SaleItemRow, value: string) => {
    const next = [...saleItems]
    next[idx] = { ...next[idx], [field]: value }
    if (field === 'product_id') {
      const p = products.find((x) => x.id === Number(value))
      next[idx].product_name = p ? p.name : ''
    }
    setSaleItems(next)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.branch || saleItems.every((r) => !r.product_id || !r.quantity || !r.unit_price)) return
    setSubmitting(true)
    const itemsPayload = saleItems
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
    api.post('/sales/sales/', {
      branch: Number(form.branch),
      customer: form.customer ? Number(form.customer) : null,
      sale_date: form.sale_date,
      status: 'draft',
      payment_type: form.payment_type,
      cash_account: form.payment_type === 'cash' && form.cash_account ? Number(form.cash_account) : null,
      discount: 0,
      notes: form.notes,
      items: itemsPayload,
    })
      .then(() => {
        setShowModal(false)
        setForm({ branch: '', customer: '', sale_date: new Date().toISOString().slice(0, 10), payment_type: 'credit', cash_account: '', notes: '' })
        setSaleItems([{ product_id: '', product_name: '', quantity: '1', unit_price: '', discount: '0' }])
        load()
      })
      .catch(() => {})
      .finally(() => setSubmitting(false))
  }

  if (loading) return <div className="page">جاري التحميل...</div>
  if (error) return <div className="page error">{error}</div>

  const statusLabel: Record<string, string> = { draft: 'مسودة', confirmed: 'مؤكدة', cancelled: 'ملغاة' }
  const paymentTypeLabel: Record<string, string> = { credit: 'آجل', cash: 'نقدي' }
  const paymentStatusLabel: Record<string, string> = { unpaid: 'غير مسدد', partial: 'مسدد جزئي', paid: 'مسدد' }

  return (
    <div className="page">
      <div className="page-actions">
        <h1>فواتير المبيعات</h1>
        <div className="page-actions-right">
          <select
            value={paymentStatusFilter}
            onChange={(e) => setPaymentStatusFilter(e.target.value)}
            className="filter-select"
            title="فلترة حسب حالة السداد"
          >
            <option value="">كل حالات السداد</option>
            <option value="unpaid">غير مسدد</option>
            <option value="partial">مسدد جزئي</option>
            <option value="paid">مسدد</option>
          </select>
          {can('manage_sales') && (
            <button type="button" className="btn-add" onClick={() => setShowModal(true)}>
              <IconPlus size={16} style={{ marginLeft: 6, verticalAlign: 'middle' }} />
              إضافة فاتورة مبيعات
            </button>
          )}
        </div>
      </div>
      <Modal open={showModal} onClose={() => setShowModal(false)} title="إضافة فاتورة مبيعات" wide>
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
              <label>العميل</label>
              <select value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })}>
                <option value="">-- بدون --</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>التاريخ *</label>
              <input type="date" value={form.sale_date} onChange={(e) => setForm({ ...form, sale_date: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>نوع الدفع</label>
              <select value={form.payment_type} onChange={(e) => setForm({ ...form, payment_type: e.target.value as 'credit' | 'cash', cash_account: '' })}>
                <option value="credit">آجل</option>
                <option value="cash">نقدي</option>
              </select>
            </div>
            {form.payment_type === 'cash' && (
              <div className="form-group">
                <label>حساب الخزينة</label>
                <select value={form.cash_account} onChange={(e) => setForm({ ...form, cash_account: e.target.value })}>
                  <option value="">اختر الحساب</option>
                  {cashAccounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            )}
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
                  {saleItems.map((row, idx) => (
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
      <Modal open={showReturnModal} onClose={() => setShowReturnModal(false)} title="إنشاء مرتجع مبيعات" wide>
        {returnSale && (
          <form onSubmit={handleReturnSubmit}>
            <p className="text-muted">فاتورة: {returnSale.sale_number} - العميل: {returnSale.customer_name || '-'}</p>
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
                      <th>المباع</th>
                      <th>المُرجع</th>
                      <th>المتبقي</th>
                      <th>كمية الإرجاع</th>
                      <th>السعر</th>
                    </tr>
                  </thead>
                  <tbody>
                    {returnableItems.map((i) => (
                      <tr key={i.sale_item}>
                        <td>{i.product_name}</td>
                        <td>{i.quantity_sold}</td>
                        <td>{i.quantity_returned}</td>
                        <td>{i.quantity_available}</td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            max={i.quantity_available}
                            step="0.01"
                            value={returnQtys[i.sale_item] ?? '0'}
                            onChange={(e) => setReturnQtys({ ...returnQtys, [i.sale_item]: e.target.value })}
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
              <th>العميل</th>
              <th>نوع الدفع</th>
              <th>الإجمالي</th>
              <th>المدفوع</th>
              <th>المتبقي</th>
              <th>حالة السداد</th>
              <th>الحالة</th>
              <th>إجراء</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id}>
                <td>{s.sale_number}</td>
                <td>{s.sale_date}</td>
                <td>{s.customer_name || '-'}</td>
                <td>{paymentTypeLabel[(s as Sale).payment_type || 'credit'] || 'آجل'}</td>
                <td>{s.total}</td>
                <td>{s.paid_amount ?? '0'}</td>
                <td>{s.due_amount ?? s.total}</td>
                <td>
                  <span className={`badge badge-${s.payment_status || 'unpaid'}`}>
                    {paymentStatusLabel[(s as Sale).payment_status || 'unpaid'] || 'غير مسدد'}
                  </span>
                </td>
                <td>{statusLabel[s.status] || s.status}</td>
                <td>
                  {s.status === 'draft' && can('manage_sales') && (
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      disabled={confirmingId === s.id}
                      onClick={() => handleConfirm(s.id)}
                    >
                      {confirmingId === s.id ? 'جاري...' : 'تأكيد'}
                    </button>
                  )}
                  {s.status === 'confirmed' && can('manage_sale_returns') && (
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      onClick={() => openReturnModal(s)}
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
            icon={<IconShoppingCart size={48} />}
            title="لا توجد فواتير مبيعات"
            description={can('manage_sales') ? 'أضف أول فاتورة لبدء التسجيل' : 'تواصل مع المدير للحصول على صلاحية إضافة فواتير المبيعات'}
            action={can('manage_sales') ? (
              <button type="button" className="btn-add" onClick={() => setShowModal(true)}>
                <IconPlus size={16} style={{ marginLeft: 6, verticalAlign: 'middle' }} />
                إضافة فاتورة مبيعات
              </button>
            ) : undefined}
          />
        )}
      </div>
    </div>
  )
}
