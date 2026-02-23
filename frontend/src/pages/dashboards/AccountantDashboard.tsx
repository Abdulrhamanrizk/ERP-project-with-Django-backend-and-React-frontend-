import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client'
import { IconWallet, IconBookOpen, IconPlus } from '../../components/icons'

interface JournalEntry {
  id: number
  entry_number: string
  entry_date: string
  is_posted: boolean
}

export default function AccountantDashboard() {
  const [cf, setCf] = useState<{ total_balance?: number; expected_receipts?: number; expected_payments?: number } | null>(null)
  const [journals, setJournals] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [cfRes, jeRes] = await Promise.allSettled([
          api.get('/reports/cashflow/'),
          api.get('/accounting/journal-entries/?limit=5'),
        ])
        if (cfRes.status === 'fulfilled') setCf(cfRes.value as { total_balance?: number; expected_receipts?: number; expected_payments?: number })
        if (jeRes.status === 'fulfilled') {
          const d = jeRes.value as { results?: JournalEntry[] }
          setJournals(d?.results || [])
        }
      } catch {
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const unpostedCount = journals.filter((j) => !j.is_posted).length

  return (
    <div className="dashboard-page">
      <section className="kpi-grid">
        <div className="kpi-card kpi-success">
          <div className="kpi-icon"><IconWallet size={24} /></div>
          <div className="kpi-content">
            <span className="kpi-label">رصيد الخزينة</span>
            <span className="kpi-value">{loading ? '...' : (cf?.total_balance ?? 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م</span>
          </div>
        </div>
        <div className="kpi-card kpi-primary">
          <div className="kpi-icon"><IconBookOpen size={24} /></div>
          <div className="kpi-content">
            <span className="kpi-label">المتوقع تحصيله</span>
            <span className="kpi-value">{loading ? '...' : (cf?.expected_receipts ?? 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م</span>
          </div>
        </div>
        <div className="kpi-card kpi-secondary">
          <div className="kpi-icon"><IconBookOpen size={24} /></div>
          <div className="kpi-content">
            <span className="kpi-label">المتوقع دفعه</span>
            <span className="kpi-value">{loading ? '...' : (cf?.expected_payments ?? 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م</span>
          </div>
        </div>
        <div className="kpi-card kpi-secondary">
          <div className="kpi-icon"><IconBookOpen size={24} /></div>
          <div className="kpi-content">
            <span className="kpi-label">قيود غير مرحّلة</span>
            <span className="kpi-value">{loading ? '...' : unpostedCount}</span>
          </div>
        </div>
      </section>
      <section className="dashboard-section">
        <h2>آخر القيود</h2>
        <div className="journal-preview-list">
          {loading ? <p className="text-muted">جاري التحميل...</p> : journals.length === 0 ? <p className="text-muted">لا توجد قيود</p> : journals.map((j) => (
            <Link key={j.id} to="/journal" className="journal-preview-item">
              <span className="journal-num">{j.entry_number}</span>
              <span className="journal-date">{j.entry_date}</span>
              {!j.is_posted && <span className="badge-unposted">غير مرحّل</span>}
            </Link>
          ))}
        </div>
        <Link to="/journal" className="btn-add mt-3">عرض كل القيود</Link>
      </section>
      <section className="dashboard-section">
        <h2>إجراءات سريعة</h2>
        <div className="quick-actions">
          <Link to="/journal" className="quick-action-card quick-action-primary">
            <IconBookOpen size={20} /><span>قيد جديد</span><IconPlus size={14} className="quick-action-plus" />
          </Link>
          <Link to="/treasury" className="quick-action-card quick-action-success">
            <IconWallet size={20} /><span>الخزينة</span><IconPlus size={14} className="quick-action-plus" />
          </Link>
        </div>
      </section>
    </div>
  )
}
