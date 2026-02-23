import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import Modal from '../components/Modal'
import EmptyState from '../components/ui/EmptyState'
import { IconTag } from '../components/icons'

interface Category {
  id: number
  organization?: number
  parent?: number | null
  name: string
  code: string
  costing_method?: string
  is_active: boolean
}

interface Org {
  id: number
  name: string
}

export default function Categories() {
  const [items, setItems] = useState<Category[]>([])
  const [orgs, setOrgs] = useState<Org[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({ organization: '', parent: '', name: '', code: '', costing_method: 'AVERAGE', is_active: true })
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const load = useCallback(() => {
    Promise.all([
      api.get<{ results: Category[] }>('/inventory/categories/'),
      api.get<{ results: Org[] }>('/core/organizations/'),
    ])
      .then(([cRes, oRes]) => {
        setItems(Array.isArray(cRes) ? cRes : (cRes as { results?: Category[] }).results || [])
        setOrgs(Array.isArray(oRes) ? oRes : (oRes as { results?: Org[] }).results || [])
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'خطأ'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const openEdit = (c: Category) => {
    setEditingId(c.id)
    setSubmitError('')
    setForm({
      organization: String(c.organization ?? ''),
      parent: String(c.parent ?? ''),
      name: c.name,
      code: c.code || '',
      costing_method: c.costing_method || 'AVERAGE',
      is_active: c.is_active,
    })
    setShowModal(true)
  }

  const openAdd = () => {
    setEditingId(null)
    setSubmitError('')
    setForm({ organization: '', parent: '', name: '', code: '', costing_method: 'AVERAGE', is_active: true })
    setShowModal(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.organization || !form.name) return
    setSubmitting(true)
    const payload = {
      organization: Number(form.organization),
      parent: form.parent ? Number(form.parent) : null,
      name: form.name,
      code: form.code || '',
      costing_method: form.costing_method || 'AVERAGE',
      is_active: form.is_active,
    }
    const req = editingId
      ? api.patch(`/inventory/categories/${editingId}/`, payload)
      : api.post('/inventory/categories/', payload)
    req
      .then(() => { setShowModal(false); setEditingId(null); setForm({ organization: '', parent: '', name: '', code: '', costing_method: 'AVERAGE', is_active: true }); setSubmitError(''); load() })
      .catch((e) => setSubmitError(e instanceof Error ? e.message : 'حدث خطأ'))
      .finally(() => setSubmitting(false))
  }

  const handleDelete = (c: Category) => {
    if (!window.confirm(`حذف الفئة "${c.name}"؟`)) return
    api.delete(`/inventory/categories/${c.id}/`).then(() => load()).catch(() => {})
  }

  if (loading) return <div className="page">جاري التحميل...</div>
  if (error) return <div className="page error">{error}</div>

  return (
    <div className="page">
      <div className="page-actions">
        <h1>فئات المنتجات</h1>
        <button type="button" className="btn-add" onClick={openAdd}>إضافة فئة</button>
      </div>
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingId ? 'تعديل فئة' : 'إضافة فئة'}>
        <form onSubmit={handleSubmit}>
          {submitError && <div className="form-error" style={{ color: '#c0392b', marginBottom: 12 }}>{submitError}</div>}
          <div className="form-group">
            <label>المنظمة *</label>
            <select value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} required>
              <option value="">اختر المنظمة</option>
              {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            {orgs.length === 0 && <small style={{ color: '#7f8c8d' }}>أضف منظمة أولاً من لوحة الإدارة</small>}
          </div>
          <div className="form-group">
            <label>الفئة الأب</label>
            <select value={form.parent} onChange={(e) => setForm({ ...form, parent: e.target.value })}>
              <option value="">-- بدون --</option>
              {items
                .filter((c) => c.organization === Number(form.organization) && c.id !== editingId)
                .map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
            </select>
          </div>
          <div className="form-group">
            <label>الاسم *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>الكود</label>
            <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          </div>
          <div className="form-group">
            <label>طريقة التكلفة</label>
            <select value={form.costing_method} onChange={(e) => setForm({ ...form, costing_method: e.target.value })}>
              <option value="AVERAGE">المتوسط المرجح</option>
              <option value="FIFO">أول وارد أول صادر</option>
            </select>
          </div>
          <div className="form-group">
            <label><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> نشط</label>
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>إلغاء</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'جاري الحفظ...' : 'حفظ'}</button>
          </div>
        </form>
      </Modal>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>الكود</th>
              <th>الاسم</th>
              <th>الفئة الأب</th>
              <th>طريقة التكلفة</th>
              <th>الحالة</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id}>
                <td>{c.code || '-'}</td>
                <td>{c.name}</td>
                <td>{items.find((x) => x.id === c.parent)?.name ?? '-'}</td>
                <td>{c.costing_method === 'FIFO' ? 'أول وارد أول صادر' : 'المتوسط المرجح'}</td>
                <td>{c.is_active ? 'نشط' : 'غير نشط'}</td>
                <td className="actions">
                  <button type="button" className="btn-icon" onClick={() => openEdit(c)} title="تعديل">✎</button>
                  <button type="button" className="btn-icon danger" onClick={() => handleDelete(c)} title="حذف">×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <EmptyState
            icon={<IconTag size={48} />}
            title="لا توجد فئات"
            description="أضف فئات لتنظيم المنتجات"
            action={<button type="button" className="btn-add" onClick={openAdd}>إضافة فئة</button>}
          />
        )}
      </div>
    </div>
  )
}
