import { useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../store/AuthContext'
import { useBranch } from '../store/BranchContext'
import Modal from '../components/Modal'
import ProductCostsModal from './ProductCosts'
import ProductLabelPrint from '../components/ProductLabelPrint'
import SerialEntryModal from '../components/SerialEntryModal'
import EmptyState from '../components/ui/EmptyState'
import { IconPackage } from '../components/icons'

interface Product {
  id: number
  organization?: number
  category?: number | null
  sku: string
  name: string
  barcode?: string
  category_name?: string
  unit: string
  track_serial: boolean
  is_active: boolean
  warranty_months?: number | null
  default_supplier?: number | null
  selling_price?: string
  purchase_price?: string
}

interface Org {
  id: number
  name: string
}

interface Category {
  id: number
  name: string
  organization?: number
}

interface Branch {
  id: number
  name: string
  organization: number
}

interface Party {
  id: number
  name: string
  organization: number
  is_supplier?: boolean
}

export default function Products() {
  const { user } = useAuth()
  const { currentBranchId } = useBranch()
  const location = useLocation()
  const navigate = useNavigate()
  const [items, setItems] = useState<Product[]>([])
  const [orgs, setOrgs] = useState<Org[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [suppliers, setSuppliers] = useState<Party[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [costsProductId, setCostsProductId] = useState<number | null>(null)
  const [costsProductName, setCostsProductName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showOpeningStock, setShowOpeningStock] = useState(false)
  const [labelProduct, setLabelProduct] = useState<Product | null>(null)
  const [serialEntry, setSerialEntry] = useState<{ productId: number; productName: string; branchId: number; branchName: string; expectedCount: number } | null>(null)

  const [form, setForm] = useState({
    organization: '',
    category: '',
    sku: '',
    name: '',
    barcode: '',
    unit: 'قطعة',
    selling_price: '',
    purchase_price: '',
    track_serial: false,
    is_active: true,
    min_stock: '',
    warranty_months: '',
    default_supplier: '',
    opening_stock_enabled: false,
    opening_branch_id: '',
    opening_quantity: '',
    opening_unit_cost: '',
    opening_note: 'رصيد افتتاحي',
  })
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(() => {
    const params = new URLSearchParams()
    if (searchQuery.trim()) params.set('search', searchQuery.trim())
    Promise.all([
      api.get<{ results: Product[] }>(`/inventory/products/${params.toString() ? '?' + params : ''}`),
      api.get<{ results: Org[] }>('/core/organizations/'),
      api.get<{ results: Category[] }>('/inventory/categories/'),
    ])
      .then(([pRes, oRes, cRes]) => {
        setItems(Array.isArray(pRes) ? pRes : (pRes as { results?: Product[] }).results || [])
        setOrgs(Array.isArray(oRes) ? oRes : (oRes as { results?: Org[] }).results || [])
        setCategories(Array.isArray(cRes) ? cRes : (cRes as { results?: Category[] }).results || [])
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'خطأ'))
      .finally(() => setLoading(false))
  }, [searchQuery])

  useEffect(() => {
    if ((location.state as { openAddModal?: boolean })?.openAddModal) {
      setEditingId(null)
      const defaultOrg = orgs.length === 1 ? String(orgs[0].id) : (user?.organization_id ? String(user.organization_id) : '')
      const orgNum = defaultOrg ? Number(defaultOrg) : 0
      const defBranch =
        currentBranchId && branches.find((b) => b.id === currentBranchId && b.organization === orgNum)
          ? String(currentBranchId)
          : branches.length === 1 && branches[0].organization === orgNum
            ? String(branches[0].id)
            : ''
      setForm({
        organization: defaultOrg,
        category: '',
        sku: '',
        name: '',
        barcode: '',
        unit: 'قطعة',
        selling_price: '',
        purchase_price: '',
        track_serial: false,
        is_active: true,
        min_stock: '',
        warranty_months: '',
        default_supplier: '',
        opening_stock_enabled: false,
        opening_branch_id: defBranch,
        opening_quantity: '',
        opening_unit_cost: '',
        opening_note: 'رصيد افتتاحي',
      })
      setShowAdvanced(false)
      setShowOpeningStock(false)
      setShowModal(true)
      navigate(location.pathname, { replace: true })
    }
  }, [location.state, location.pathname, navigate, user?.organization_id, orgs, currentBranchId, branches])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (form.organization) {
      api.get<{ results: Branch[] }>(`/core/branches/?organization=${form.organization}`)
        .then((r) => setBranches(Array.isArray(r) ? r : (r as { results?: Branch[] })?.results || []))
        .catch(() => setBranches([]))
      api.get<{ results: Party[] }>(`/core/parties/?organization=${form.organization}&is_supplier=true`)
        .then((r) => setSuppliers(Array.isArray(r) ? r : (r as { results?: Party[] })?.results || []))
        .catch(() => setSuppliers([]))
    } else {
      setBranches([])
      setSuppliers([])
    }
  }, [form.organization])

  const orgId = orgs.length === 1 ? orgs[0].id : null

  const openEdit = (p: Product) => {
    setEditingId(p.id)
    setForm({
      organization: String(p.organization ?? ''),
      category: String(p.category ?? ''),
      sku: p.sku || '',
      name: p.name,
      barcode: p.barcode || '',
      unit: p.unit || 'قطعة',
      selling_price: p.selling_price || '',
      purchase_price: p.purchase_price || '',
      track_serial: p.track_serial,
      is_active: p.is_active,
      min_stock: '',
      warranty_months: p.warranty_months != null ? String(p.warranty_months) : '',
      default_supplier: String(p.default_supplier ?? ''),
      opening_stock_enabled: false,
      opening_branch_id: '',
      opening_quantity: '',
      opening_unit_cost: '',
      opening_note: 'رصيد افتتاحي',
    })
    setShowModal(true)
  }

  const openAdd = () => {
    setEditingId(null)
    const defaultOrg = orgId ? String(orgId) : (user?.organization_id ? String(user.organization_id) : '')
    const orgNum = defaultOrg ? Number(defaultOrg) : 0
    const branchInOrg = (b: Branch) => b.organization === orgNum
    const defaultBranch =
      currentBranchId && branches.find((b) => b.id === currentBranchId && branchInOrg(b))
        ? String(currentBranchId)
        : branches.length === 1 && branchInOrg(branches[0])
          ? String(branches[0].id)
          : ''
    setForm({
      organization: defaultOrg,
      category: '',
      sku: '',
      name: '',
      barcode: '',
      unit: 'قطعة',
      selling_price: '',
      purchase_price: '',
      track_serial: false,
      is_active: true,
      min_stock: '',
      warranty_months: '',
      default_supplier: '',
      opening_stock_enabled: false,
      opening_branch_id: defaultBranch,
      opening_quantity: '',
      opening_unit_cost: '',
      opening_note: 'رصيد افتتاحي',
    })
    setShowAdvanced(false)
    setShowOpeningStock(false)
    setShowModal(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.organization || !form.name) return
    const selling = form.selling_price ? parseFloat(form.selling_price) : undefined
    if (!editingId && selling === undefined) {
      setError('سعر البيع مطلوب')
      return
    }
    setSubmitting(true)
    setError('')
    const org = form.organization || (orgs.length === 1 ? String(orgs[0].id) : '')
    const payload: Record<string, unknown> = {
      organization: Number(org),
      category: form.category ? Number(form.category) : null,
      sku: form.sku || '',
      name: form.name,
      barcode: form.barcode || '',
      unit: form.unit || 'قطعة',
      track_serial: form.track_serial,
      is_active: form.is_active,
      min_stock: form.min_stock ? parseFloat(form.min_stock) : 0,
      warranty_months: form.warranty_months ? parseInt(form.warranty_months, 10) : null,
      default_supplier: form.default_supplier ? Number(form.default_supplier) : null,
    }
    if (!editingId) {
      payload.selling_price = selling
      payload.purchase_price = form.purchase_price ? parseFloat(form.purchase_price) : undefined
      payload.opening_stock_enabled = form.opening_stock_enabled
      if (form.opening_stock_enabled) {
        payload.opening_branch_id = Number(form.opening_branch_id)
        payload.opening_quantity = parseFloat(form.opening_quantity)
        payload.opening_unit_cost = form.opening_unit_cost ? parseFloat(form.opening_unit_cost) : undefined
        payload.opening_note = form.opening_note || 'رصيد افتتاحي'
      }
    }
    const req = editingId
      ? api.patch(`/inventory/products/${editingId}/`, payload)
      : api.post('/inventory/products/', payload)
    req
      .then((res) => {
        const createdProduct = res as { id?: number }
        setShowModal(false)
        setEditingId(null)
        if (!editingId && form.opening_stock_enabled && form.track_serial && createdProduct?.id) {
          const qty = parseFloat(form.opening_quantity)
          if (qty > 0 && form.opening_branch_id) {
            const branch = branches.find((b) => b.id === Number(form.opening_branch_id))
            setSerialEntry({
              productId: createdProduct.id,
              productName: form.name,
              branchId: Number(form.opening_branch_id),
              branchName: branch?.name ?? '',
              expectedCount: Math.floor(qty),
            })
          }
        }
        openAdd()
        setForm({ ...form, organization: '', category: '', sku: '', name: '', selling_price: '', purchase_price: '' })
        load()
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'فشل الحفظ'))
      .finally(() => setSubmitting(false))
  }

  const handleDelete = (p: Product) => {
    if (!window.confirm(`حذف المنتج "${p.name}"؟`)) return
    api.delete(`/inventory/products/${p.id}/`).then(() => load()).catch(() => {})
  }

  const handlePrintLabel = (p: Product) => {
    setLabelProduct(p)
  }

  if (loading) return <div className="page">جاري التحميل...</div>

  return (
    <div className="page">
      <div className="page-actions">
        <h1>المنتجات</h1>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="بحث بالاسم، الرمز، أو الباركود..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ padding: '0.4rem 0.75rem', minWidth: 200, borderRadius: 6, border: '1px solid #ccc' }}
          />
          <button type="button" className="btn-add" onClick={openAdd}>إضافة منتج</button>
        </div>
      </div>
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingId ? 'تعديل منتج' : 'إضافة منتج'} wide>
        <form onSubmit={handleSubmit}>
          {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
          {(orgs.length > 1 || !orgId) && (
            <div className="form-group">
              <label>المنظمة *</label>
              <select value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value, category: '' })} required>
                <option value="">اختر المنظمة</option>
                {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
          )}
          {orgs.length === 1 && <input type="hidden" name="organization" value={orgs[0].id} />}
          {/* Main fields - quick form */}
          <div className="form-row">
            <div className="form-group">
              <label>الفئة</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="">-- بدون --</option>
                {categories.filter((c) => !form.organization || c.organization === Number(form.organization)).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>اسم المنتج *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>الوحدة</label>
              <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="قطعة" />
            </div>
            <div className="form-group">
              <label>سعر البيع *</label>
              <input type="number" min="0" step="0.01" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: e.target.value })} required={!editingId} />
            </div>
            <div className="form-group">
              <label>سعر الشراء</label>
              <input type="number" min="0" step="0.01" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} placeholder="موصى به" />
            </div>
          </div>
          <div className="form-group">
            <label><input type="checkbox" checked={form.track_serial} onChange={(e) => setForm({ ...form, track_serial: e.target.checked })} /> المنتج له رقم مسلسل (Serial Number)</label>
          </div>
          <div className="form-group">
            <label><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> متاح للبيع والاستخدام</label>
          </div>
          <div style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>
            <button type="button" className="btn-link" onClick={() => setShowAdvanced(!showAdvanced)}>
              {showAdvanced ? '▼' : '▶'} إعدادات إضافية
            </button>
          </div>
          {showAdvanced && (
            <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: 8, marginBottom: '1rem' }}>
              <div className="form-row">
                <div className="form-group">
                  <label>الرمز (SKU)</label>
                  <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="يُولَّد تلقائياً إن تُرك فارغاً" />
                </div>
                <div className="form-group">
                  <label>الباركود</label>
                  <input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} placeholder="يُولَّد تلقائياً إن تُرك فارغاً" />
                </div>
              </div>
              <div className="form-group">
                <label>حد إعادة الطلب</label>
                <input type="number" min="0" step="0.01" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} />
              </div>
              {form.track_serial && (
                <div className="form-group">
                  <label>مدة الضمان بالشهور</label>
                  <input type="number" min="0" step="1" value={form.warranty_months} onChange={(e) => setForm({ ...form, warranty_months: e.target.value })} placeholder="اختياري" />
                </div>
              )}
              <div className="form-group">
                <label>المورد الافتراضي</label>
                <select value={form.default_supplier} onChange={(e) => setForm({ ...form, default_supplier: e.target.value })}>
                  <option value="">-- بدون --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
          {!editingId && (
            <>
              <div style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>
                <label><input type="checkbox" checked={form.opening_stock_enabled} onChange={(e) => { setForm({ ...form, opening_stock_enabled: e.target.checked }); setShowOpeningStock(e.target.checked) }} /> إضافة رصيد افتتاحي الآن</label>
              </div>
              {form.opening_stock_enabled && (
                <div style={{ padding: '1rem', background: '#f0fdf4', borderRadius: 8, marginBottom: '1rem', border: '1px solid #86efac' }}>
                  <div className="form-row">
                    <div className="form-group">
                      <label>الفرع *</label>
                      <select value={form.opening_branch_id} onChange={(e) => setForm({ ...form, opening_branch_id: e.target.value })} required>
                        <option value="">اختر الفرع</option>
                        {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>الكمية *</label>
                      <input type="number" min="0.01" step="0.01" value={form.opening_quantity} onChange={(e) => setForm({ ...form, opening_quantity: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label>تكلفة الوحدة</label>
                      <input type="number" min="0" step="0.01" value={form.opening_unit_cost} onChange={(e) => setForm({ ...form, opening_unit_cost: e.target.value })} placeholder="سعر الشراء إن تُرك فارغاً" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>مرجع الحركة</label>
                    <input value={form.opening_note} onChange={(e) => setForm({ ...form, opening_note: e.target.value })} />
                  </div>
                </div>
              )}
            </>
          )}
          <div className="form-actions">
            {editingId && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  const p = items.find((x) => x.id === editingId)
                  if (p) setLabelProduct(p)
                }}
                title="طباعة لابل"
              >
                طباعة لابل
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>إلغاء</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'جاري الحفظ...' : 'حفظ'}</button>
          </div>
        </form>
      </Modal>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>الرمز</th>
              <th>اسم المنتج</th>
              <th>الفئة</th>
              <th>سعر البيع</th>
              <th>الباركود</th>
              <th>رقم مسلسل؟</th>
              <th>متاح؟</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id}>
                <td>{p.sku || '-'}</td>
                <td>{p.name}</td>
                <td>{p.category_name || '-'}</td>
                <td>{p.selling_price ?? '-'} {p.selling_price ? 'ج.م' : ''}</td>
                <td>{p.barcode || '-'}</td>
                <td>
                  <span className={`badge ${p.track_serial ? 'badge-info' : 'badge-muted'}`} title={p.track_serial ? 'منتج له رقم مسلسل' : 'بدون رقم مسلسل'}>
                    {p.track_serial ? 'نعم' : 'لا'}
                  </span>
                </td>
                <td>
                  <span className={`badge ${p.is_active ? 'badge-success' : 'badge-muted'}`} title={p.is_active ? 'متاح للبيع' : 'غير متاح'}>
                    {p.is_active ? 'نعم' : 'لا'}
                  </span>
                </td>
                <td className="actions">
                  <button type="button" className="btn-icon" onClick={() => handlePrintLabel(p)} title="طباعة لابل">🏷</button>
                  <button type="button" className="btn-icon" onClick={() => { setCostsProductId(p.id); setCostsProductName(p.name) }} title="أسعار وتكاليف">$</button>
                  <button type="button" className="btn-icon" onClick={() => openEdit(p)} title="تعديل">✎</button>
                  <button type="button" className="btn-icon danger" onClick={() => handleDelete(p)} title="حذف">×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && !loading && (
          <EmptyState
            icon={<IconPackage size={48} />}
            title={searchQuery.trim() ? 'لا توجد نتائج للبحث' : 'لا توجد منتجات'}
            description={searchQuery.trim() ? `لم يتم العثور على منتجات تطابق "${searchQuery.trim()}"` : 'سجل المنتجات لإدارة المخزون والمبيعات'}
            action={<button type="button" className="btn-add" onClick={openAdd}>إضافة منتج</button>}
          />
        )}
      </div>
      {costsProductId && (
        <ProductCostsModal
          open={!!costsProductId}
          onClose={() => setCostsProductId(null)}
          productId={costsProductId}
          productName={costsProductName}
          organizationId={items.find((x) => x.id === costsProductId)?.organization ?? 0}
          onSaved={() => load()}
        />
      )}
      {serialEntry && (
        <SerialEntryModal
          open={!!serialEntry}
          onClose={() => setSerialEntry(null)}
          onSaved={() => load()}
          productId={serialEntry.productId}
          productName={serialEntry.productName}
          branchId={serialEntry.branchId}
          branchName={serialEntry.branchName}
          expectedCount={serialEntry.expectedCount}
        />
      )}
      {labelProduct && (
        <Modal open={!!labelProduct} onClose={() => setLabelProduct(null)} title="معاينة اللابل">
          <ProductLabelPrint
            productName={labelProduct.name}
            barcode={labelProduct.barcode || ''}
            sellingPrice={labelProduct.selling_price || '0'}
            sku={labelProduct.sku}
          />
          <div style={{ marginTop: '1rem' }}>
            <button type="button" className="btn btn-primary" onClick={() => window.print()}>طباعة</button>
            <button type="button" className="btn btn-secondary" onClick={() => setLabelProduct(null)} style={{ marginRight: 8 }}>إغلاق</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
