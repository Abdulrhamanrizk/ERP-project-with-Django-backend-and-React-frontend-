import { useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useHotkeys } from 'react-hotkeys-hook'
import { api } from '../api/client'
import { useBranch } from '../store/BranchContext'
import { usePermissions } from '../hooks/usePermissions'
import Modal from '../components/Modal'
import EmptyState from '../components/ui/EmptyState'
import { IconWallet, IconCreditCard } from '../components/icons'

interface Payment {
  id: number
  payment_type: string
  amount: string
  payment_date: string
  cash_account_name: string
  party_name?: string
  sale_number?: string
  purchase_number?: string
  reference: string
  is_posted: boolean
}

interface CashAccount {
  id: number
  name: string
  branch: number
  account_type: string
  bank_name: string
  is_active: boolean
}

interface Branch {
  id: number
  name: string
  organization: number
}

export default function Treasury() {
  const { currentBranchId } = useBranch()
  const { can } = usePermissions()
  const location = useLocation()
  const navigate = useNavigate()
  const [payments, setPayments] = useState<Payment[]>([])
  const [accounts, setAccounts] = useState<CashAccount[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'receipt' | 'payment' | 'accounts' | 'transfer'>('receipt')
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<'receipt' | 'payment'>('receipt')
  const [form, setForm] = useState({
    branch: '',
    cash_account: '',
    payment_type: 'receipt' as 'receipt' | 'payment',
    source_type: 'other' as 'customer' | 'supplier' | 'other',
    party: '',
    sale: '',
    purchase: '',
    amount: '',
    payment_date: new Date().toISOString().slice(0, 10),
    reference: '',
    description: '',
  })
  const [transferForm, setTransferForm] = useState({
    branch: '',
    from_account: '',
    to_account: '',
    amount: '',
    transfer_date: new Date().toISOString().slice(0, 10),
    reference: '',
  })
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [transfers, setTransfers] = useState<{ id: number; from_account_name: string; to_account_name: string; amount: string; transfer_date: string; is_posted: boolean }[]>([])
  const [transferSubmitting, setTransferSubmitting] = useState(false)
  const [parties, setParties] = useState<{ id: number; name: string; is_customer: boolean; is_supplier: boolean }[]>([])
  const [sales, setSales] = useState<{ id: number; sale_number: string }[]>([])
  const [purchases, setPurchases] = useState<{ id: number; purchase_number: string }[]>([])

  const loadPartiesAndInvoices = useCallback((branchId: string, orgId: number) => {
    if (!branchId || !orgId) return
    Promise.all([
      api.get<{ results: { id: number; name: string; is_customer: boolean; is_supplier: boolean }[] }>(`/core/parties/?organization=${orgId}`),
      api.get<{ results: { id: number; sale_number: string }[] }>(`/sales/sales/?branch=${branchId}`),
      api.get<{ results: { id: number; purchase_number: string }[] }>(`/purchases/purchases/?branch=${branchId}`),
    ])
      .then(([pRes, sRes, purRes]) => {
        setParties(Array.isArray(pRes) ? pRes : (pRes as { results?: unknown[] }).results || [])
        setSales(Array.isArray(sRes) ? sRes : (sRes as { results?: unknown[] }).results || [])
        setPurchases(Array.isArray(purRes) ? purRes : (purRes as { results?: unknown[] }).results || [])
      })
      .catch(() => { setParties([]); setSales([]); setPurchases([]) })
  }, [])

  const load = useCallback(() => {
    api.get<{ results: Payment[] }>('/treasury/payments/')
      .then((res) => setPayments(Array.isArray(res) ? res : (res as { results?: Payment[] }).results || []))
      .catch(() => setPayments([]))
  }, [])

  const loadTransfers = useCallback(() => {
    api.get<{ results: { id: number; from_account_name: string; to_account_name: string; amount: string; transfer_date: string; is_posted: boolean }[] }>('/treasury/transfers/')
      .then((res) => setTransfers(Array.isArray(res) ? res : (res as { results?: unknown[] }).results || []))
      .catch(() => setTransfers([]))
  }, [])

  const [postingPaymentId, setPostingPaymentId] = useState<number | null>(null)
  const [postingTransferId, setPostingTransferId] = useState<number | null>(null)

  useHotkeys('ctrl+shift+n', (e) => {
    e.preventDefault()
    setModalType('receipt')
    setShowModal(true)
  })

  useEffect(() => {
    const state = location.state as { openAddModal?: string } | null
    if (state?.openAddModal === 'receipt' && can('manage_treasury')) {
      setModalType('receipt')
      setTab('receipt')
      setShowModal(true)
      navigate(location.pathname, { replace: true })
    }
  }, [location.state, location.pathname, navigate, can])

  const handlePostPayment = useCallback((id: number) => {
    setPostingPaymentId(id)
    api.post(`/treasury/payments/${id}/post_entry/`)
      .then(() => load())
      .catch(() => {})
      .finally(() => setPostingPaymentId(null))
  }, [load])

  const handlePostTransfer = useCallback((id: number) => {
    setPostingTransferId(id)
    api.post(`/treasury/transfers/${id}/post_entry/`)
      .then(() => loadTransfers())
      .catch(() => {})
      .finally(() => setPostingTransferId(null))
  }, [loadTransfers])

  useEffect(() => {
    const loadAll = async () => {
      try {
        const [pRes, aRes, bRes, tRes] = await Promise.all([
          api.get<{ results: Payment[] }>('/treasury/payments/'),
          api.get<{ results: CashAccount[] }>('/treasury/cash-accounts/?is_active=true'),
          api.get<{ results: Branch[] }>('/core/branches/'),
          api.get<{ results: unknown[] }>('/treasury/transfers/'),
        ])
        setPayments(Array.isArray(pRes) ? pRes : (pRes as { results?: Payment[] }).results || [])
        setAccounts(Array.isArray(aRes) ? aRes : (aRes as { results?: CashAccount[] }).results || [])
        setBranches(Array.isArray(bRes) ? bRes : (bRes as { results?: Branch[] }).results || [])
        setTransfers(Array.isArray(tRes) ? tRes : (tRes as { results?: { id: number; from_account_name: string; to_account_name: string; amount: string; transfer_date: string; is_posted: boolean }[] }).results || [])
      } catch {
        setPayments([])
        setAccounts([])
        setBranches([])
        setTransfers([])
      } finally {
        setLoading(false)
      }
    }
    loadAll()
  }, [currentBranchId])

  const branchAccounts = form.branch
    ? accounts.filter((a) => a.branch === Number(form.branch))
    : []
  const customers = parties.filter((p) => p.is_customer)
  const suppliers = parties.filter((p) => p.is_supplier)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.branch || !form.cash_account || !form.amount || parseFloat(form.amount) <= 0) return
    setSubmitting(true)
    api.post('/treasury/payments/', {
      branch: Number(form.branch),
      cash_account: Number(form.cash_account),
      payment_type: form.payment_type,
      source_type: form.source_type,
      party: form.party ? Number(form.party) : null,
      sale: form.sale ? Number(form.sale) : null,
      purchase: form.purchase ? Number(form.purchase) : null,
      amount: parseFloat(form.amount),
      payment_date: form.payment_date,
      reference: form.reference,
      description: form.description,
    })
      .then(() => {
        setShowModal(false)
        setForm({
          branch: '',
          cash_account: '',
          payment_type: 'receipt',
          source_type: 'other',
          party: '',
          sale: '',
          purchase: '',
          amount: '',
          payment_date: new Date().toISOString().slice(0, 10),
          reference: '',
          description: '',
        })
        load()
      })
      .catch(() => {})
      .finally(() => setSubmitting(false))
  }

  if (loading) return <div className="page">جاري التحميل...</div>

  const typeLabel: Record<string, string> = { receipt: 'سند قبض', payment: 'سند صرف' }
  const filteredPayments = tab === 'receipt'
    ? payments.filter((p) => p.payment_type === 'receipt')
    : tab === 'payment'
      ? payments.filter((p) => p.payment_type === 'payment')
      : []

  const openAddModal = (type: 'receipt' | 'payment') => {
    setModalType(type)
    setForm({ ...form, payment_type: type })
    setShowModal(true)
  }

  return (
    <div className="page">
      <div className="page-actions">
        <h1>الخزينة</h1>
        {can('manage_treasury') && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="btn-add" onClick={() => openAddModal('receipt')}>إضافة سند قبض</button>
            <button type="button" className="btn-add" onClick={() => openAddModal('payment')}>إضافة سند صرف</button>
          </div>
        )}
      </div>
      <Modal open={showModal} onClose={() => setShowModal(false)} title={modalType === 'receipt' ? 'إضافة سند قبض' : 'إضافة سند صرف'}>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>الفرع *</label>
              <select value={form.branch} onChange={(e) => {
                const b = branches.find((x) => x.id === Number(e.target.value)) as Branch | undefined
                setForm({ ...form, branch: e.target.value, cash_account: '', party: '', sale: '', purchase: '' })
                if (b?.organization) loadPartiesAndInvoices(e.target.value, b.organization)
              }} required>
                <option value="">اختر الفرع</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>حساب الخزينة *</label>
              <select value={form.cash_account} onChange={(e) => setForm({ ...form, cash_account: e.target.value })} required disabled={!form.branch}>
                <option value="">اختر الحساب</option>
                {branchAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>النوع *</label>
              <select value={form.payment_type} onChange={(e) => setForm({ ...form, payment_type: e.target.value as 'receipt' | 'payment' })} required>
                <option value="receipt">سند قبض</option>
                <option value="payment">سند صرف</option>
              </select>
            </div>
            <div className="form-group">
              <label>المصدر</label>
              <select value={form.source_type} onChange={(e) => setForm({ ...form, source_type: e.target.value as 'customer' | 'supplier' | 'other', party: '', sale: '', purchase: '' })}>
                <option value="customer">عميل</option>
                <option value="supplier">مورد</option>
                <option value="other">أخرى</option>
              </select>
            </div>
            {form.source_type === 'customer' && (
              <>
                <div className="form-group">
                  <label>العميل</label>
                  <select value={form.party} onChange={(e) => setForm({ ...form, party: e.target.value })}>
                    <option value="">-- اختياري --</option>
                    {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>ربط بفاتورة مبيعات</label>
                  <select value={form.sale} onChange={(e) => setForm({ ...form, sale: e.target.value })}>
                    <option value="">-- بدون --</option>
                    {sales.map((s) => <option key={s.id} value={s.id}>{s.sale_number}</option>)}
                  </select>
                </div>
              </>
            )}
            {form.source_type === 'supplier' && (
              <>
                <div className="form-group">
                  <label>المورد</label>
                  <select value={form.party} onChange={(e) => setForm({ ...form, party: e.target.value })}>
                    <option value="">-- اختياري --</option>
                    {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>ربط بفاتورة مشتريات</label>
                  <select value={form.purchase} onChange={(e) => setForm({ ...form, purchase: e.target.value })}>
                    <option value="">-- بدون --</option>
                    {purchases.map((p) => <option key={p.id} value={p.id}>{p.purchase_number}</option>)}
                  </select>
                </div>
              </>
            )}
            <div className="form-group">
              <label>المبلغ *</label>
              <input type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>التاريخ *</label>
              <input type="date" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} required />
            </div>
          </div>
          <div className="form-group">
            <label>المرجع</label>
            <input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
          </div>
          <div className="form-group">
            <label>الوصف</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>إلغاء</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'جاري الحفظ...' : 'حفظ'}</button>
          </div>
        </form>
      </Modal>
      <div className="tabs">
        <button type="button" className={tab === 'receipt' ? 'active' : ''} onClick={() => setTab('receipt')}>
          سندات قبض
        </button>
        <button type="button" className={tab === 'payment' ? 'active' : ''} onClick={() => setTab('payment')}>
          سندات صرف
        </button>
        <button type="button" className={tab === 'accounts' ? 'active' : ''} onClick={() => setTab('accounts')}>
          حسابات الخزينة
        </button>
        <button type="button" className={tab === 'transfer' ? 'active' : ''} onClick={() => setTab('transfer')}>
          التحويلات
        </button>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {tab === 'transfer' && can('manage_treasury') && (
          <button type="button" className="btn-add" onClick={() => setShowTransferModal(true)}>تحويل بين الحسابات</button>
        )}
      </div>
      {(tab === 'receipt' || tab === 'payment') && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>النوع</th>
                <th>المبلغ</th>
                <th>التاريخ</th>
                <th>الحساب</th>
                <th>الطرف/الفاتورة</th>
                <th>المرجع</th>
                <th>الحالة</th>
                <th>إجراء</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((p) => (
                <tr key={p.id}>
                  <td>{typeLabel[p.payment_type] || p.payment_type}</td>
                  <td>{p.amount}</td>
                  <td>{p.payment_date}</td>
                  <td>{p.cash_account_name}</td>
                  <td>{p.party_name || p.sale_number || p.purchase_number || '-'}</td>
                  <td>{p.reference || '-'}</td>
                  <td>{p.is_posted ? 'مرحّل' : 'غير مرحّل'}</td>
                  <td>
                    {!p.is_posted && can('manage_treasury') && (
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        disabled={postingPaymentId === p.id}
                        onClick={() => handlePostPayment(p.id)}
                      >
                        {postingPaymentId === p.id ? 'جاري...' : 'ترحيل'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredPayments.length === 0 && (
            <EmptyState
              icon={<IconWallet size={48} />}
              title={tab === 'receipt' ? 'لا توجد سندات قبض' : 'لا توجد سندات صرف'}
              description={tab === 'receipt' ? 'أضف سند قبض لتسجيل الإيرادات' : 'أضف سند صرف لتسجيل المدفوعات'}
              action={can('manage_treasury') ? <button type="button" className="btn-add" onClick={() => openAddModal(tab)}>إضافة {tab === 'receipt' ? 'سند قبض' : 'سند صرف'}</button> : undefined}
            />
          )}
        </div>
      )}
      {tab === 'accounts' && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>الاسم</th>
                <th>النوع</th>
                <th>البنك</th>
                <th>الرصيد</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id}>
                  <td>{a.name}</td>
                  <td>{a.account_type === 'cash' ? 'خزينة' : 'بنك'}</td>
                  <td>{a.bank_name || '-'}</td>
                  <td>{(a as CashAccount & { balance?: number }).balance?.toFixed(2) ?? '-'}</td>
                  <td>{a.is_active ? 'نشط' : 'غير نشط'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {accounts.length === 0 && (
            <EmptyState
              icon={<IconCreditCard size={48} />}
              title="لا توجد حسابات خزينة"
              description="أضف حسابات الخزينة والبنوك من لوحة الإدارة"
            />
          )}
        </div>
      )}
      {tab === 'transfer' && (
        <>
          <Modal open={showTransferModal} onClose={() => setShowTransferModal(false)} title="تحويل بين الحسابات">
            <form onSubmit={(e) => {
              e.preventDefault()
              if (!transferForm.branch || !transferForm.from_account || !transferForm.to_account || !transferForm.amount || parseFloat(transferForm.amount) <= 0) return
              setTransferSubmitting(true)
              api.post('/treasury/transfers/', {
                branch: Number(transferForm.branch),
                from_account: Number(transferForm.from_account),
                to_account: Number(transferForm.to_account),
                amount: parseFloat(transferForm.amount),
                transfer_date: transferForm.transfer_date,
                reference: transferForm.reference,
              })
                .then(() => {
                  setShowTransferModal(false)
                  setTransferForm({ branch: '', from_account: '', to_account: '', amount: '', transfer_date: new Date().toISOString().slice(0, 10), reference: '' })
                  loadTransfers()
                })
                .catch(() => {})
                .finally(() => setTransferSubmitting(false))
            }}>
              <div className="form-group">
                <label>الفرع *</label>
                <select value={transferForm.branch} onChange={(e) => setTransferForm({ ...transferForm, branch: e.target.value, from_account: '', to_account: '' })} required>
                  <option value="">اختر الفرع</option>
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>من حساب *</label>
                  <select value={transferForm.from_account} onChange={(e) => setTransferForm({ ...transferForm, from_account: e.target.value })} required disabled={!transferForm.branch}>
                    <option value="">اختر</option>
                    {accounts.filter((a) => a.branch === Number(transferForm.branch)).map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>إلى حساب *</label>
                  <select value={transferForm.to_account} onChange={(e) => setTransferForm({ ...transferForm, to_account: e.target.value })} required disabled={!transferForm.branch}>
                    <option value="">اختر</option>
                    {accounts.filter((a) => a.branch === Number(transferForm.branch)).map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>المبلغ *</label>
                  <input type="number" min="0.01" step="0.01" value={transferForm.amount} onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>التاريخ *</label>
                  <input type="date" value={transferForm.transfer_date} onChange={(e) => setTransferForm({ ...transferForm, transfer_date: e.target.value })} required />
                </div>
              </div>
              <div className="form-group">
                <label>المرجع</label>
                <input value={transferForm.reference} onChange={(e) => setTransferForm({ ...transferForm, reference: e.target.value })} />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowTransferModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={transferSubmitting}>{transferSubmitting ? 'جاري...' : 'تنفيذ'}</button>
              </div>
            </form>
          </Modal>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>من</th>
                  <th>إلى</th>
                  <th>المبلغ</th>
                  <th>التاريخ</th>
                  <th>المرجع</th>
                  <th>الحالة</th>
                  <th>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map((t) => (
                  <tr key={t.id}>
                    <td>{t.from_account_name}</td>
                    <td>{t.to_account_name}</td>
                    <td>{t.amount}</td>
                    <td>{t.transfer_date}</td>
                    <td>{(t as { reference?: string }).reference || '-'}</td>
                    <td>{t.is_posted ? 'مرحّل' : 'غير مرحّل'}</td>
                    <td>
                      {!t.is_posted && can('manage_treasury') && (
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          disabled={postingTransferId === t.id}
                          onClick={() => handlePostTransfer(t.id)}
                        >
                          {postingTransferId === t.id ? 'جاري...' : 'ترحيل'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {transfers.length === 0 && (
              <EmptyState
                icon={<IconWallet size={48} />}
                title="لا توجد تحويلات"
                description="انقل الأموال بين الحسابات"
                action={can('manage_treasury') ? <button type="button" className="btn-add" onClick={() => setShowTransferModal(true)}>تحويل بين الحسابات</button> : undefined}
              />
            )}
          </div>
        </>
      )}
    </div>
  )
}
