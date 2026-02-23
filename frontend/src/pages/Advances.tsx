import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import { useBranch } from '../store/BranchContext'
import { usePermissions } from '../hooks/usePermissions'
import Modal from '../components/Modal'
import EmptyState from '../components/ui/EmptyState'
import { IconBookOpen } from '../components/icons'

interface Advance {
  id: number
  branch: number
  user: number
  user_name: string
  advance_type: string
  amount: string
  date: string
  description: string
  is_settled: boolean
}

interface Branch {
  id: number
  name: string
}

interface User {
  id: number
  username: string
}

export default function Advances() {
  const { currentBranchId } = useBranch()
  const { can } = usePermissions()
  const [items, setItems] = useState<Advance[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    branch: '',
    user: '',
    advance_type: 'advance' as 'advance' | 'custody',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    description: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(() => {
    api.get<{ results: Advance[] }>('/treasury/advances/')
      .then((res) => setItems(Array.isArray(res) ? res : (res as { results?: Advance[] }).results || []))
      .catch(() => setItems([]))
  }, [])

  useEffect(() => {
    Promise.all([
      api.get<{ results: Advance[] }>('/treasury/advances/'),
      api.get<{ results: Branch[] }>('/core/branches/'),
      api.get<{ results: User[] }>('/core/users/'),
    ])
      .then(([aRes, bRes, uRes]) => {
        setItems(Array.isArray(aRes) ? aRes : (aRes as { results?: Advance[] }).results || [])
        setBranches(Array.isArray(bRes) ? bRes : (bRes as { results?: Branch[] }).results || [])
        setUsers(Array.isArray(uRes) ? uRes : (uRes as { results?: User[] }).results || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [currentBranchId])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.branch || !form.user || !form.amount) return
    setSubmitting(true)
    api.post('/treasury/advances/', {
      branch: Number(form.branch),
      user: Number(form.user),
      advance_type: form.advance_type,
      amount: parseFloat(form.amount),
      date: form.date,
      description: form.description,
    })
      .then(() => {
        setShowModal(false)
        setForm({ branch: '', user: '', advance_type: 'advance', amount: '', date: new Date().toISOString().slice(0, 10), description: '' })
        load()
      })
      .catch(() => {})
      .finally(() => setSubmitting(false))
  }

  const handleSettle = (id: number) => {
    if (!window.confirm('تسوية هذه العهدة/السلفة؟')) return
    api.patch(`/treasury/advances/${id}/`, { is_settled: true }).then(() => load()).catch(() => {})
  }

  if (loading) return <div className="page">جاري التحميل...</div>

  const typeLabel: Record<string, string> = { advance: 'سلفة', custody: 'عهدة' }

  return (
    <div className="page">
      <div className="page-actions">
        <h1>العهد والسلف</h1>
        {can('manage_advances') && <button type="button" className="btn-add" onClick={() => setShowModal(true)}>إضافة عهدة/سلفة</button>}
      </div>
      <Modal open={showModal} onClose={() => setShowModal(false)} title="إضافة عهدة أو سلفة">
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>الفرع *</label>
              <select value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} required>
                <option value="">اختر الفرع</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>الموظف *</label>
              <select value={form.user} onChange={(e) => setForm({ ...form, user: e.target.value })} required>
                <option value="">اختر الموظف</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.username}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>النوع *</label>
              <select value={form.advance_type} onChange={(e) => setForm({ ...form, advance_type: e.target.value as 'advance' | 'custody' })} required>
                <option value="advance">سلفة</option>
                <option value="custody">عهدة</option>
              </select>
            </div>
            <div className="form-group">
              <label>المبلغ *</label>
              <input type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>التاريخ *</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            </div>
          </div>
          <div className="form-group">
            <label>الوصف</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>إلغاء</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'جاري...' : 'حفظ'}</button>
          </div>
        </form>
      </Modal>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>الموظف</th>
              <th>النوع</th>
              <th>المبلغ</th>
              <th>التاريخ</th>
              <th>الحالة</th>
              <th>إجراء</th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => (
              <tr key={a.id}>
                <td>{a.user_name}</td>
                <td>{typeLabel[a.advance_type] || a.advance_type}</td>
                <td>{a.amount}</td>
                <td>{a.date}</td>
                <td>{a.is_settled ? 'مسوّاة' : 'غير مسوّاة'}</td>
                <td>
                  {!a.is_settled && can('manage_advances') && (
                    <button type="button" className="btn-link" onClick={() => handleSettle(a.id)}>تسوية</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <EmptyState
            icon={<IconBookOpen size={48} />}
            title="لا توجد عهد أو سلف"
            description="سجل عهد الموظفين والسلف"
            action={can('manage_advances') ? <button type="button" className="btn-add" onClick={() => setShowModal(true)}>إضافة عهدة/سلفة</button> : undefined}
          />
        )}
      </div>
    </div>
  )
}
