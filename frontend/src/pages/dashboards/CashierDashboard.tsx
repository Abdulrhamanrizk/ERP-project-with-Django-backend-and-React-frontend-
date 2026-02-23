import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client'
import { IconShoppingCart, IconWallet, IconPlus } from '../../components/icons'

export default function CashierDashboard() {
  const [todaySales, setTodaySales] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)
  const [cashBalance, setCashBalance] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const today = new Date().toISOString().slice(0, 10)
        const [cfRes, salesRes] = await Promise.allSettled([
          api.get<{ total_balance?: number }>('/reports/cashflow/'),
          api.get<{ results?: { total: string; sale_date: string; status: string }[] }>('/sales/sales/'),
        ])
        if (cfRes.status === 'fulfilled') {
          setCashBalance((cfRes.value as { total_balance?: number }).total_balance ?? 0)
        }
        if (salesRes.status === 'fulfilled') {
          const arr = (salesRes.value as { results?: { total: string; sale_date: string; status: string }[] }).results || []
          const todayTotal = arr.filter((s) => s.sale_date === today).reduce((sum, s) => sum + parseFloat(s.total || '0'), 0)
          const pending = arr.filter((s) => s.status === 'draft').length
          setTodaySales(todayTotal)
          setPendingCount(pending)
        }
      } catch {
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="dashboard-page">
      <section className="kpi-grid">
        <div className="kpi-card kpi-primary">
          <div className="kpi-icon"><IconShoppingCart size={24} /></div>
          <div className="kpi-content">
            <span className="kpi-label">مبيعات اليوم</span>
            <span className="kpi-value">
              {loading ? '...' : todaySales.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
            </span>
          </div>
        </div>
        <div className="kpi-card kpi-secondary">
          <div className="kpi-icon"><IconShoppingCart size={24} /></div>
          <div className="kpi-content">
            <span className="kpi-label">فواتير معلقة</span>
            <span className="kpi-value">{loading ? '...' : pendingCount}</span>
          </div>
        </div>
        <div className="kpi-card kpi-success">
          <div className="kpi-icon"><IconWallet size={24} /></div>
          <div className="kpi-content">
            <span className="kpi-label">رصيد الخزينة</span>
            <span className="kpi-value">
              {loading ? '...' : cashBalance.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
            </span>
          </div>
        </div>
      </section>
      <section className="dashboard-section">
        <h2>إجراءات سريعة</h2>
        <div className="quick-actions">
          <Link to="/sales" className="quick-action-card quick-action-primary">
            <IconShoppingCart size={20} />
            <span>فاتورة مبيعات</span>
            <IconPlus size={14} className="quick-action-plus" />
          </Link>
          <Link to="/treasury" className="quick-action-card quick-action-success">
            <IconWallet size={20} />
            <span>سند قبض</span>
            <IconPlus size={14} className="quick-action-plus" />
          </Link>
        </div>
      </section>
    </div>
  )
}
