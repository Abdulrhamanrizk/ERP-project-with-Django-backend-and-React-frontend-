import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import Modal from '../components/Modal'
import EmptyState from '../components/ui/EmptyState'
import { IconUsers } from '../components/icons'

interface Party {
  id: number
  organization?: number
  name: string
  code: string
  phone: string
  is_customer: boolean
  is_supplier: boolean
  is_active: boolean
}

interface Org {
  id: number
  name: string
}

export default function Parties() {
  const [items, setItems] = useState<Party[]>([])
  const [orgs, setOrgs] = useState<Org[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({ organization: '', name: '', code: '', phone: '', is_customer: true, is_supplier: false, is_active: true })
  const [submitting, setSubmitting] = useState(false)
  const [showLedger, setShowLedger] = useState(false)
  const [ledgerParty, setLedgerParty] = useState<Party | null>(null)
  const [ledgerData, setLedgerData] = useState<{ entries: { date: string; doc_type: string; doc_number: string; description: string; debit: number; credit: number; balance: number }[]; balance: number } | null>(null)
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([])
  const [ledgerBranch, setLedgerBranch] = useState('')

  const load = useCallback(() => {
    Promise.all([
      api.get<{ results: Party[] }>('/core/parties/'),
      api.get<{ results: Org[] }>('/core/organizations/'),
    ])
      .then(([pRes, oRes]) => {
        setItems(Array.isArray(pRes) ? pRes : (pRes as { results?: Party[] }).results || [])
        setOrgs(Array.isArray(oRes) ? oRes : (oRes as { results?: Org[] }).results || [])
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'خطأ'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const openLedger = (p: Party) => {
    setLedgerParty(p)
    setLedgerBranch('')
    setLedgerData(null)
    setShowLedger(true)
  }

  const loadLedger = useCallback(() => {
    if (!ledgerParty) return
    const qs = ledgerBranch ? `?branch=${ledgerBranch}` : ''
    api.get<{ entries: { date: string; doc_type: string; doc_number: string; description: string; debit: number; credit: number; balance: number }[]; balance: number }>(`/core/parties/${ledgerParty.id}/ledger/${qs}`)
      .then(setLedgerData)
      .catch(() => setLedgerData(null))
  }, [ledgerParty, ledgerBranch])

  useEffect(() => {
    if (showLedger && ledgerParty) loadLedger()
  }, [showLedger, ledgerParty, ledgerBranch, loadLedger])

  useEffect(() => {
    if (showLedger) {
      api.get<{ results: { id: number; name: string }[] }>('/core/branches/')
        .then((res) => setBranches(Array.isArray(res) ? res : (res as { results?: { id: number; name: string }[] })?.results || []))
        .catch(() => setBranches([]))
    }
  }, [showLedger])

  const openEdit = (p: Party) => {
    setEditingId(p.id)
    setForm({
      organization: String(p.organization ?? ''),
      name: p.name,
      code: p.code || '',
      phone: p.phone || '',
      is_customer: p.is_customer,
      is_supplier: p.is_supplier,
      is_active: p.is_active,
    })
    setShowModal(true)
  }

  const openAdd = () => {
    setEditingId(null)
    setForm({ organization: '', name: '', code: '', phone: '', is_customer: true, is_supplier: false, is_active: true })
    setShowModal(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.organization || !form.name) return
    setSubmitting(true)
    const payload = {
      organization: Number(form.organization),
      name: form.name,
      code: form.code || '',
      phone: form.phone || '',
      is_customer: form.is_customer,
      is_supplier: form.is_supplier,
      is_active: form.is_active,
    }
    const req = editingId
      ? api.patch(`/core/parties/${editingId}/`, payload)
      : api.post('/core/parties/', payload)
    req
      .then(() => { setShowModal(false); setEditingId(null); setForm({ organization: '', name: '', code: '', phone: '', is_customer: true, is_supplier: false, is_active: true }); load() })
      .catch(() => {})
      .finally(() => setSubmitting(false))
  }

  const handleDelete = (p: Party) => {
    if (!window.confirm(`حذف "${p.name}"؟`)) return
    api.delete(`/core/parties/${p.id}/`).then(() => load()).catch(() => {})
  }

  if (loading) return <div className="page">جاري التحميل...</div>
  if (error) return <div className="page error">{error}</div>

  return (
    <div className="page">
      <div className="page-actions">
        <h1>العملاء والموردون</h1>
        <button type="button" className="btn-add" onClick={openAdd}>إضافة طرف</button>
      </div>
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingId ? 'تعديل عميل/مورد' : 'إضافة عميل/مورد'}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>المنظمة *</label>
            <select value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} required>
              <option value="">اختر المنظمة</option>
              {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            {orgs.length === 0 && <small style={{ color: '#7f8c8d' }}>أضف منظمة أولاً من لوحة الإدارة</small>}
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
            <label>الهاتف</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="form-group">
            <label><input type="checkbox" checked={form.is_customer} onChange={(e) => setForm({ ...form, is_customer: e.target.checked })} /> عميل</label>
          </div>
          <div className="form-group">
            <label><input type="checkbox" checked={form.is_supplier} onChange={(e) => setForm({ ...form, is_supplier: e.target.checked })} /> مورد</label>
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
      <Modal open={showLedger} onClose={() => setShowLedger(false)} title={`كشف حساب - ${ledgerParty?.name || ''}`} wide>
        {ledgerParty && (
          <>
            <div className="form-row" style={{ marginBottom: '1rem' }}>
              <div className="form-group">
                <label>الفرع</label>
                <select value={ledgerBranch} onChange={(e) => setLedgerBranch(e.target.value)}>
                  <option value="">الكل</option>
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </div>
            {ledgerData && (
              <>
                <p><strong>الرصيد: {ledgerData.balance.toFixed(2)}</strong> {ledgerParty.is_customer ? '(مدين = للعميل)' : '(دائن = علينا)'}</p>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>التاريخ</th>
                        <th>النوع</th>
                        <th>الرقم</th>
                        <th>الوصف</th>
                        <th>مدين</th>
                        <th>دائن</th>
                        <th>الرصيد</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledgerData.entries.map((e, i) => (
                        <tr key={i}>
                          <td>{e.date}</td>
                          <td>{e.doc_type}</td>
                          <td>{e.doc_number}</td>
                          <td>{e.description}</td>
                          <td>{e.debit > 0 ? e.debit.toFixed(2) : '-'}</td>
                          <td>{e.credit > 0 ? e.credit.toFixed(2) : '-'}</td>
                          <td>{e.balance.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </Modal>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>الكود</th>
              <th>الاسم</th>
              <th>الهاتف</th>
              <th>عميل</th>
              <th>مورد</th>
              <th>الحالة</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id}>
                <td>{p.code || '-'}</td>
                <td>{p.name}</td>
                <td>{p.phone || '-'}</td>
                <td>{p.is_customer ? 'نعم' : 'لا'}</td>
                <td>{p.is_supplier ? 'نعم' : 'لا'}</td>
                <td>{p.is_active ? 'نشط' : 'غير نشط'}</td>
                <td className="actions">
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => openLedger(p)} title="كشف حساب">كشف حساب</button>
                  <button type="button" className="btn-icon" onClick={() => openEdit(p)} title="تعديل">✎</button>
                  <button type="button" className="btn-icon danger" onClick={() => handleDelete(p)} title="حذف">×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <EmptyState
            icon={<IconUsers size={48} />}
            title="لا يوجد عملاء أو موردون"
            description="أضف العملاء والموردين للربط بالفواتير"
            action={<button type="button" className="btn-add" onClick={openAdd}>إضافة طرف</button>}
          />
        )}
      </div>
    </div>
  )
}
