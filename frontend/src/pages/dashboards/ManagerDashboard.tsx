import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client'
import { IconShoppingCart, IconWallet, IconBarChart, IconPlus } from '../../components/icons'

interface KPIData {
  totalSales: number
  totalProfit: number
  cashBalance: number
  invoiceCount: number
}

interface Alert {
  type: string
  priority: string
  title: string
  link: string
}

export default function ManagerDashboard() {
  const [kpi, setKpi] = useState<KPIData | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [cfRes, salesRes, profRes, alertsRes] = await Promise.allSettled([
          api.get('/reports/cashflow/'),
          api.get('/sales/sales/'),
          api.get('/reports/profitability/'),
          api.get('/reports/alerts/'),
        ])
        let totalSales = 0
        let invoiceCount = 0
        if (salesRes.status === 'fulfilled') {
          const arr = (salesRes.value as { results?: { total: string }[] }).results || []
          invoiceCount = arr.length
          totalSales = arr.reduce((s, x) => s + parseFloat(x.total || '0'), 0)
        }
        let totalProfit = 0
        if (profRes.status === 'fulfilled') {
          const d = profRes.value as { summary?: { total_profit?: number } }
          totalProfit = d?.summary?.total_profit ?? 0
        }
        let cashBalance = 0
        if (cfRes.status === 'fulfilled') {
          const d = cfRes.value as { total_balance?: number }
          cashBalance = d?.total_balance ?? 0
        }
        const alertList = alertsRes.status === 'fulfilled' ? (alertsRes.value as { alerts?: Alert[] }).alerts || [] : []
        setKpi({ totalSales, totalProfit, cashBalance, invoiceCount })
        setAlerts(alertList.slice(0, 5))
      } catch {
        setKpi({ totalSales: 0, totalProfit: 0, cashBalance: 0, invoiceCount: 0 })
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
            <span className="kpi-label">إجمالي المبيعات</span>
            <span className="kpi-value">{loading ? '...' : (kpi?.totalSales ?? 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م</span>
          </div>
        </div>
        <div className="kpi-card kpi-success">
          <div className="kpi-icon"><IconBarChart size={24} /></div>
          <div className="kpi-content">
            <span className="kpi-label">الأرباح</span>
            <span className="kpi-value">{loading ? '...' : (kpi?.totalProfit ?? 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م</span>
          </div>
        </div>
        <div className="kpi-card kpi-secondary">
          <div className="kpi-icon"><IconWallet size={24} /></div>
          <div className="kpi-content">
            <span className="kpi-label">رصيد الخزينة</span>
            <span className="kpi-value">{loading ? '...' : (kpi?.cashBalance ?? 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م</span>
          </div>
        </div>
        <div className="kpi-card kpi-secondary">
          <div className="kpi-icon"><IconShoppingCart size={24} /></div>
          <div className="kpi-content">
            <span className="kpi-label">عدد الفواتير</span>
            <span className="kpi-value">{loading ? '...' : (kpi?.invoiceCount ?? 0)}</span>
          </div>
        </div>
      </section>
      {alerts.length > 0 && (
        <section className="dashboard-section">
          <h2>تنبيهات مهمة</h2>
          <div className="alerts-list-inline">
            {alerts.map((a, i) => (
              <Link key={i} to={a.link} className={`alert-inline alert-${a.priority}`}>{a.title}</Link>
            ))}
          </div>
        </section>
      )}
      <section className="dashboard-section">
        <h2>إجراءات سريعة</h2>
        <div className="quick-actions">
          <Link to="/sales" className="quick-action-card quick-action-primary">
            <IconShoppingCart size={20} /><span>فاتورة مبيعات</span><IconPlus size={14} className="quick-action-plus" />
          </Link>
          <Link to="/reports" className="quick-action-card quick-action-info">
            <IconBarChart size={20} /><span>التقارير</span><IconPlus size={14} className="quick-action-plus" />
          </Link>
        </div>
      </section>
    </div>
  )
}
