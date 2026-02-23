import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client'
import {
  IconPackage,
  IconWarehouse,
  IconPlus,
} from '../../components/icons'

interface Alert {
  type: string
  title: string
  description: string
  link: string
}

export default function WarehouseDashboard() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<{ alerts?: Alert[] }>('/reports/alerts/')
      .then((r) => {
        const lowStock = (r.alerts || []).filter((a) => a.type === 'low_stock')
        setAlerts(lowStock)
      })
      .catch(() => setAlerts([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="dashboard-page">
      <section className="kpi-grid">
        <div className="kpi-card kpi-primary">
          <div className="kpi-icon"><IconPackage size={24} /></div>
          <div className="kpi-content">
            <span className="kpi-label">منتجات تحت الحد الأدنى</span>
            <span className="kpi-value">{loading ? '...' : alerts.length}</span>
          </div>
        </div>
        <div className="kpi-card kpi-secondary">
          <div className="kpi-icon"><IconWarehouse size={24} /></div>
          <div className="kpi-content">
            <span className="kpi-label">حركات المخزون</span>
            <span className="kpi-value">—</span>
          </div>
        </div>
      </section>

      {alerts.length > 0 && (
        <section className="dashboard-section">
          <h2>نقص المخزون</h2>
          <div className="alerts-table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>المنتج</th>
                  <th>التفاصيل</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((a, i) => (
                  <tr key={i}>
                    <td>{a.title.replace('نقص مخزون: ', '')}</td>
                    <td>
                      <Link to={a.link} className="link">{a.description}</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="dashboard-section">
        <h2>إجراءات سريعة</h2>
        <div className="quick-actions">
          <Link to="/warehouse" className="quick-action-card quick-action-primary">
            <IconWarehouse size={20} />
            <span>حركات المخزون</span>
            <IconPlus size={14} className="quick-action-plus" />
          </Link>
          <Link to="/products" className="quick-action-card quick-action-info">
            <IconPackage size={20} />
            <span>المنتجات</span>
            <IconPlus size={14} className="quick-action-plus" />
          </Link>
        </div>
      </section>
    </div>
  )
}
