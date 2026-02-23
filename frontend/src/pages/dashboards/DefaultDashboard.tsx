import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client'
import {
  IconPackage,
  IconUsers,
  IconShoppingCart,
  IconCreditCard,
  IconWallet,
  IconBookOpen,
  IconWrench,
  IconWarehouse,
  IconBarChart,
  IconPlus,
  IconExternalLink,
} from '../../components/icons'
import ActivityTimeline from '../../components/ActivityTimeline'

const quickModules = [
  { title: 'فاتورة مبيعات', href: '/sales', icon: IconShoppingCart, color: 'primary' },
  { title: 'فاتورة مشتريات', href: '/purchases', icon: IconCreditCard, color: 'secondary' },
  { title: 'سند قبض', href: '/treasury', icon: IconWallet, color: 'success' },
  { title: 'منتج جديد', href: '/products', icon: IconPackage, color: 'info' },
]

const modules = [
  { title: 'المنتجات', desc: 'إدارة المنتجات والفئات', href: '/products', icon: IconPackage, external: false },
  { title: 'العملاء والموردون', desc: 'إدارة الأطراف', href: '/parties', icon: IconUsers, external: false },
  { title: 'المبيعات', desc: 'فواتير المبيعات', href: '/sales', icon: IconShoppingCart, external: false },
  { title: 'المشتريات', desc: 'فواتير المشتريات', href: '/purchases', icon: IconCreditCard, external: false },
  { title: 'الخزينة', desc: 'سندات قبض وصرف', href: '/treasury', icon: IconWallet, external: false },
  { title: 'العهد والسلف', desc: 'عهد وسلف الموظفين', href: '/advances', icon: IconBookOpen, external: false },
  { title: 'القيود اليومية', desc: 'القيود المحاسبية', href: '/journal', icon: IconBookOpen, external: false },
  { title: 'الصيانة', desc: 'أوامر الصيانة', href: '/maintenance', icon: IconWrench, external: false },
  { title: 'المخزن', desc: 'حركات المخزون', href: '/warehouse', icon: IconWarehouse, external: false },
  { title: 'التقارير', desc: 'التقارير المالية', href: '/reports', icon: IconBarChart, external: false },
  { title: 'لوحة الإدارة', desc: 'إدارة النظام', href: 'http://127.0.0.1:8001/admin/', icon: IconExternalLink, external: true },
]

export default function DefaultDashboard() {
  const [kpi, setKpi] = useState({ totalSales: 0, totalPurchases: 0, cashBalance: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [cfRes, salesRes, purchasesRes] = await Promise.allSettled([
          api.get('/reports/cashflow/'),
          api.get('/sales/sales/'),
          api.get('/purchases/purchases/'),
        ])
        let totalSales = 0
        let totalPurchases = 0
        let cashBalance = 0
        if (salesRes.status === 'fulfilled') {
          const arr = (salesRes.value as { results?: { total: string }[] }).results || []
          totalSales = arr.reduce((s, x) => s + parseFloat(x.total || '0'), 0)
        }
        if (purchasesRes.status === 'fulfilled') {
          const arr = (purchasesRes.value as { results?: { total: string }[] }).results || []
          totalPurchases = arr.reduce((s, x) => s + parseFloat(x.total || '0'), 0)
        }
        if (cfRes.status === 'fulfilled') {
          cashBalance = (cfRes.value as { total_balance?: number }).total_balance ?? 0
        }
        setKpi({ totalSales, totalPurchases, cashBalance })
      } catch {
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <>
      <section className="kpi-grid">
        <div className="kpi-card kpi-primary">
          <div className="kpi-icon"><IconShoppingCart size={24} /></div>
          <div className="kpi-content">
            <span className="kpi-label">إجمالي المبيعات</span>
            <span className="kpi-value">{loading ? '...' : kpi.totalSales.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م</span>
          </div>
        </div>
        <div className="kpi-card kpi-secondary">
          <div className="kpi-icon"><IconCreditCard size={24} /></div>
          <div className="kpi-content">
            <span className="kpi-label">إجمالي المشتريات</span>
            <span className="kpi-value">{loading ? '...' : kpi.totalPurchases.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م</span>
          </div>
        </div>
        <div className="kpi-card kpi-success">
          <div className="kpi-icon"><IconWallet size={24} /></div>
          <div className="kpi-content">
            <span className="kpi-label">رصيد الخزينة</span>
            <span className="kpi-value">{loading ? '...' : kpi.cashBalance.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م</span>
          </div>
        </div>
      </section>
      <section className="dashboard-section">
        <h2>إجراءات سريعة</h2>
        <div className="quick-actions">
          {quickModules.map((m) => {
            const Icon = m.icon
            return (
              <Link key={m.title} to={m.href} className={`quick-action-card quick-action-${m.color}`}>
                <Icon size={20} />
                <span>{m.title}</span>
                <IconPlus size={14} className="quick-action-plus" />
              </Link>
            )
          })}
        </div>
      </section>
      <div className="dashboard-grid">
        <section className="dashboard-section modules-section">
          <h2>الوحدات</h2>
          <div className="modules-grid">
            {modules.map((m) => {
              const Icon = m.icon
              if (m.external || m.href.startsWith('http')) {
                return (
                  <a key={m.title} href={m.href} target="_blank" rel="noreferrer" className="module-card">
                    <Icon size={24} className="module-icon" />
                    <h3>{m.title}</h3>
                    <p>{m.desc}</p>
                    <IconExternalLink size={14} className="module-link-icon" />
                  </a>
                )
              }
              return (
                <Link key={m.title} to={m.href} className="module-card">
                  <Icon size={24} className="module-icon" />
                  <h3>{m.title}</h3>
                  <p>{m.desc}</p>
                </Link>
              )
            })}
          </div>
        </section>
        <section className="dashboard-section activity-section">
          <h2>سجل النشاط</h2>
          <ActivityTimeline />
        </section>
      </div>
    </>
  )
}
