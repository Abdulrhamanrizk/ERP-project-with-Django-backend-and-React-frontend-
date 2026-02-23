import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import { useBranch } from '../store/BranchContext'
import { usePermissions } from '../hooks/usePermissions'
import Modal from '../components/Modal'
import EmptyState from '../components/ui/EmptyState'
import { IconWrench } from '../components/icons'

interface MaintenanceOrder {
  id: number
  order_number: string
  customer_name: string
  customer_phone: string
  device_description: string
  status: string
  branch_name: string
  created_at: string
}

interface Branch {
  id: number
  name: string
}

export default function Maintenance() {
  const { currentBranchId } = useBranch()
  const { can } = usePermissions()
  const [items, setItems] = useState<MaintenanceOrder[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    branch: '',
    customer_name: '',
    customer_phone: '',
    device_description: '',
    status: 'open',
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(() => {
    api.get<{ results: MaintenanceOrder[] }>('/maintenance/maintenance-orders/')
      .then((res) => setItems(Array.isArray(res) ? res : (res as { results?: MaintenanceOrder[] }).results || []))
      .catch(() => setItems([]))
  }, [])

  useEffect(() => {
    Promise.all([
      api.get<{ results: MaintenanceOrder[] }>('/maintenance/maintenance-orders/'),
      api.get<{ results: Branch[] }>('/core/branches/'),
    ])
      .then(([oRes, bRes]) => {
        setItems(Array.isArray(oRes) ? oRes : (oRes as { results?: MaintenanceOrder[] }).results || [])
        setBranches(Array.isArray(bRes) ? bRes : (bRes as { results?: Branch[] }).results || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [currentBranchId])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.branch || !form.customer_name) return
    setSubmitting(true)
    api.post('/maintenance/maintenance-orders/', {
      branch: Number(form.branch),
      customer_name: form.customer_name,
      customer_phone: form.customer_phone,
      device_description: form.device_description,
      status: 'open',
      notes: form.notes,
    })
      .then(() => {
        setShowModal(false)
        setForm({ branch: '', customer_name: '', customer_phone: '', device_description: '', status: 'open', notes: '' })
        load()
      })
      .catch(() => {})
      .finally(() => setSubmitting(false))
  }

  if (loading) return <div className="page">جاري التحميل...</div>

  const statusLabel: Record<string, string> = {
    open: 'مفتوح',
    in_progress: 'قيد التنفيذ',
    done: 'منتهي',
    cancelled: 'ملغى',
  }

  return (
    <div className="page">
      <div className="page-actions">
        <h1>أوامر الصيانة</h1>
        {can('manage_maintenance') && <button type="button" className="btn-add" onClick={() => setShowModal(true)}>إضافة أمر صيانة</button>}
      </div>
      <Modal open={showModal} onClose={() => setShowModal(false)} title="إضافة أمر صيانة">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>الفرع *</label>
            <select value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} required>
              <option value="">اختر الفرع</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>اسم العميل *</label>
            <input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>هاتف العميل</label>
            <input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
          </div>
          <div className="form-group">
            <label>وصف الجهاز</label>
            <textarea value={form.device_description} onChange={(e) => setForm({ ...form, device_description: e.target.value })} rows={2} />
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
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>رقم الأمر</th>
              <th>اسم العميل</th>
              <th>الهاتف</th>
              <th>الجهاز</th>
              <th>الفرع</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            {items.map((o) => (
              <tr key={o.id}>
                <td>{o.order_number}</td>
                <td>{o.customer_name}</td>
                <td>{o.customer_phone || '-'}</td>
                <td>{o.device_description || '-'}</td>
                <td>{o.branch_name}</td>
                <td>{statusLabel[o.status] || o.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <EmptyState
            icon={<IconWrench size={48} />}
            title="لا توجد أوامر صيانة"
            description="سجل أوامر الصيانة للعملاء"
            action={can('manage_maintenance') ? <button type="button" className="btn-add" onClick={() => setShowModal(true)}>إضافة أمر صيانة</button> : undefined}
          />
        )}
      </div>
    </div>
  )
}
