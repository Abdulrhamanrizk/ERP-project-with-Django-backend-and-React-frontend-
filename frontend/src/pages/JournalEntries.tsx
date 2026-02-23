import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import { useBranch } from '../store/BranchContext'
import { usePermissions } from '../hooks/usePermissions'
import Modal from '../components/Modal'
import EmptyState from '../components/ui/EmptyState'
import { IconBookOpen } from '../components/icons'

interface JournalLine {
  id: number
  account: number
  account_code: string
  account_name: string
  debit: string
  credit: string
  description: string
  cost_center?: number
}

interface JournalEntry {
  id: number
  entry_number: string
  entry_date: string
  journal_type: string
  description: string
  branch_name: string
  branch: number
  total_debit: string
  total_credit: string
  is_posted?: boolean
  lines: JournalLine[]
}

interface Branch {
  id: number
  name: string
  organization: number
}

interface Account {
  id: number
  code: string
  name: string
  organization: number
}

interface CostCenter {
  id: number
  code: string
  name: string
  organization: number
}

interface JournalLineRow {
  account_id: string
  account_name: string
  description: string
  debit: string
  credit: string
  cost_center_id: string
}

export default function JournalEntries() {
  const { currentBranchId } = useBranch()
  const { can } = usePermissions()
  const [items, setItems] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [branches, setBranches] = useState<Branch[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [costCenters, setCostCenters] = useState<CostCenter[]>([])
  const [form, setForm] = useState({
    branch: '',
    entry_date: new Date().toISOString().slice(0, 10),
    description: '',
  })
  const [lines, setLines] = useState<JournalLineRow[]>([
    { account_id: '', account_name: '', description: '', debit: '0', credit: '0', cost_center_id: '' },
  ])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    api.get<{ results: JournalEntry[] }>('/accounting/journal-entries/')
      .then((res) => setItems(Array.isArray(res) ? res : (res as { results?: JournalEntry[] }).results || []))
      .catch(() => setItems([]))
  }, [])

  useEffect(() => {
    load()
    api.get<{ results: Branch[] }>('/core/branches/')
      .then((res) => setBranches(Array.isArray(res) ? res : (res as { results?: Branch[] }).results || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [load, currentBranchId])

  const loadAccountsAndCostCenters = useCallback((orgId: number) => {
    if (!orgId) return
    Promise.all([
      api.get<{ results: Account[] }>(`/accounting/accounts/?organization=${orgId}&is_active=true`),
      api.get<{ results: CostCenter[] }>(`/accounting/cost-centers/?organization=${orgId}&is_active=true`),
    ])
      .then(([aRes, cRes]) => {
        setAccounts(Array.isArray(aRes) ? aRes : (aRes as { results?: Account[] })?.results || [])
        setCostCenters(Array.isArray(cRes) ? cRes : (cRes as { results?: CostCenter[] })?.results || [])
      })
      .catch(() => { setAccounts([]); setCostCenters([]) })
  }, [])

  const addLine = () => {
    setLines([...lines, { account_id: '', account_name: '', description: '', debit: '0', credit: '0', cost_center_id: '' }])
  }

  const removeLine = (idx: number) => {
    if (lines.length <= 1) return
    setLines(lines.filter((_, i) => i !== idx))
  }

  const updateLine = (idx: number, field: keyof JournalLineRow, value: string) => {
    const next = [...lines]
    next[idx] = { ...next[idx], [field]: value }
    if (field === 'account_id') {
      const acc = accounts.find((a) => a.id === Number(value))
      next[idx].account_name = acc ? `${acc.code} - ${acc.name}` : ''
    }
    setLines(next)
  }

  const totalDebit = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0)
  const totalCredit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0)
  const diff = totalDebit - totalCredit
  const isBalanced = Math.abs(diff) < 0.01

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.branch || !isBalanced) return
    const validLines = lines.filter((l) => l.account_id && ((parseFloat(l.debit) || 0) > 0 || (parseFloat(l.credit) || 0) > 0))
    if (validLines.length === 0) {
      setError('أضف بنداً واحداً على الأقل بحساب ومدين أو دائن')
      return
    }
    setError('')
    setSubmitting(true)
    const payload = {
      branch: Number(form.branch),
      entry_date: form.entry_date,
      journal_type: 'manual',
      description: form.description || '',
      is_posted: false,
      lines: validLines.map((l) => ({
        account: Number(l.account_id),
        debit: parseFloat(l.debit) || 0,
        credit: parseFloat(l.credit) || 0,
        description: l.description || '',
        cost_center: l.cost_center_id ? Number(l.cost_center_id) : null,
      })),
    }
    api.post('/accounting/journal-entries/', payload)
      .then(() => {
        setShowModal(false)
        setForm({ branch: '', entry_date: new Date().toISOString().slice(0, 10), description: '' })
        setLines([{ account_id: '', account_name: '', description: '', debit: '0', credit: '0', cost_center_id: '' }])
        load()
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'فشل الحفظ'))
      .finally(() => setSubmitting(false))
  }

  if (loading) return <div className="page">جاري التحميل...</div>

  const typeLabel: Record<string, string> = { manual: 'يدوي', auto: 'تلقائي', compound: 'مركب' }

  return (
    <div className="page">
      <div className="page-actions">
        <h1>القيود اليومية</h1>
        {can('manage_journal') && (
          <button type="button" className="btn-add" onClick={() => setShowModal(true)}>
            إنشاء قيد يدوي
          </button>
        )}
      </div>
      <Modal open={showModal} onClose={() => setShowModal(false)} title="إنشاء قيد يومي يدوي" wide>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>الفرع *</label>
              <select
                value={form.branch}
                onChange={(e) => {
                  setForm({ ...form, branch: e.target.value })
                  const b = branches.find((x) => x.id === Number(e.target.value))
                  if (b) loadAccountsAndCostCenters(b.organization)
                }}
                required
              >
                <option value="">اختر الفرع</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>التاريخ *</label>
              <input type="date" value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} required />
            </div>
          </div>
          <div className="form-group">
            <label>الوصف</label>
            <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="وصف القيد" />
          </div>
          <div className="form-group">
            <label>بنود القيد</label>
            <div className="sale-items-table">
              <table>
                <thead>
                  <tr>
                    <th>الحساب</th>
                    <th>الوصف</th>
                    <th>مركز التكلفة</th>
                    <th>مدين</th>
                    <th>دائن</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((row, idx) => (
                    <tr key={idx}>
                      <td>
                        <select
                          value={row.account_id}
                          onChange={(e) => updateLine(idx, 'account_id', e.target.value)}
                          required
                        >
                          <option value="">اختر الحساب</option>
                          {accounts.map((a) => (
                            <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                          ))}
                        </select>
                      </td>
                      <td><input type="text" value={row.description} onChange={(e) => updateLine(idx, 'description', e.target.value)} placeholder="وصف البند" /></td>
                      <td>
                        <select value={row.cost_center_id} onChange={(e) => updateLine(idx, 'cost_center_id', e.target.value)}>
                          <option value="">--</option>
                          {costCenters.map((c) => (
                            <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                          ))}
                        </select>
                      </td>
                      <td><input type="number" min="0" step="0.01" value={row.debit} onChange={(e) => updateLine(idx, 'debit', e.target.value)} /></td>
                      <td><input type="number" min="0" step="0.01" value={row.credit} onChange={(e) => updateLine(idx, 'credit', e.target.value)} /></td>
                      <td><button type="button" className="btn-icon" onClick={() => removeLine(idx)} title="حذف">×</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" className="btn-link" onClick={addLine}>+ إضافة بند</button>
          </div>
          <div className="form-group journal-totals">
            <div className="totals-row">
              <span>إجمالي المدين:</span>
              <strong>{totalDebit.toFixed(2)}</strong>
            </div>
            <div className="totals-row">
              <span>إجمالي الدائن:</span>
              <strong>{totalCredit.toFixed(2)}</strong>
            </div>
            <div className={`totals-row ${!isBalanced ? 'unbalanced' : ''}`}>
              <span>الفرق:</span>
              <strong>{diff.toFixed(2)}</strong>
            </div>
          </div>
          {error && <p className="text-danger">{error}</p>}
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>إلغاء</button>
            <button type="submit" className="btn btn-primary" disabled={submitting || !isBalanced || !form.branch}>
              {submitting ? 'جاري الحفظ...' : 'حفظ كمسودة'}
            </button>
          </div>
        </form>
      </Modal>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>رقم القيد</th>
              <th>التاريخ</th>
              <th>الفرع</th>
              <th>النوع</th>
              <th>الوصف</th>
              <th>مدين</th>
              <th>دائن</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            {items.map((e) => (
              <tr key={e.id}>
                <td>{e.entry_number}</td>
                <td>{e.entry_date}</td>
                <td>{e.branch_name}</td>
                <td>{typeLabel[e.journal_type] || e.journal_type}</td>
                <td>{e.description || '-'}</td>
                <td>{e.total_debit}</td>
                <td>{e.total_credit}</td>
                <td>
                  <span className={`badge ${e.is_posted ? 'badge-paid' : 'badge-partial'}`}>
                    {e.is_posted ? 'مرحّل' : 'مسودة'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <EmptyState
            icon={<IconBookOpen size={48} />}
            title="لا توجد قيود"
            description="أنشئ قيداً يدوياً أو تؤكد الفواتير والمدفوعات لإنشاء قيود تلقائية."
            action={<button type="button" className="btn-add" onClick={() => setShowModal(true)}>إنشاء قيد يدوي</button>}
          />
        )}
      </div>
    </div>
  )
}
