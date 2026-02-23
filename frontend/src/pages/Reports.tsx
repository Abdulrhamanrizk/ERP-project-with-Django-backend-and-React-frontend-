import { useState, useEffect } from 'react'
import { api } from '../api/client'
import SalesTrendChart from '../components/charts/SalesTrendChart'
import TopProductsChart from '../components/charts/TopProductsChart'

interface CashFlowData {
  total_balance: number
  accounts: { name: string; balance: number; branch: string }[]
  expected_receipts: number
  expected_payments: number
  alert_low_balance: boolean
}

function CashFlowSummary() {
  const [data, setData] = useState<CashFlowData | null>(null)
  useEffect(() => {
    api.get<CashFlowData>('/reports/cashflow/').then(setData).catch(() => setData(null))
  }, [])
  if (!data) return <p className="report-note">جاري التحميل...</p>
  return (
    <div className="report-cards" style={{ marginBottom: '1rem' }}>
      <div className="report-card">
        <span className="report-value">{data.total_balance.toFixed(2)}</span>
        <span className="report-label">الرصيد الإجمالي</span>
      </div>
      <div className="report-card">
        <span className="report-value">{data.expected_receipts.toFixed(2)}</span>
        <span className="report-label">متوقع تحصيله</span>
      </div>
      <div className="report-card">
        <span className="report-value">{data.expected_payments.toFixed(2)}</span>
        <span className="report-label">متوقع دفعه</span>
      </div>
      {data.alert_low_balance && (
        <div className="report-card" style={{ border: '2px solid #dc2626' }}>
          <span className="report-value" style={{ color: '#dc2626', fontSize: '1rem' }}>تنبيه</span>
          <span className="report-label">نقص في السيولة</span>
        </div>
      )}
    </div>
  )
}

interface Summary {
  products: number
  categories: number
  parties: number
  sales: number
  purchases: number
}

interface ProfitRow {
  product_name: string
  category_name: string
  branch_name: string
  sale_number: string
  quantity: number
  revenue: number
  cost: number
  profit: number
}

export default function Reports() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [profitability, setProfitability] = useState<{ rows: ProfitRow[]; summary: { total_revenue: number; total_cost: number; total_profit: number } } | null>(null)
  const [profitLoading, setProfitLoading] = useState(false)
  const [profitFilters, setProfitFilters] = useState({ branch: '', date_from: '', date_to: '' })
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([])
  const [agingData, setAgingData] = useState<{ receivable: { party_name: string; total: number; current: number; 30: number; 60: number; 90: number; over90: number }[]; payable: { party_name: string; total: number; current: number; 30: number; 60: number; 90: number; over90: number }[] } | null>(null)
  const [agingLoading, setAgingLoading] = useState(false)
  const [agingFilters, setAgingFilters] = useState({ branch: '', as_of: new Date().toISOString().slice(0, 10) })

  const loadAging = () => {
    setAgingLoading(true)
    const params = new URLSearchParams()
    if (agingFilters.branch) params.set('branch', agingFilters.branch)
    if (agingFilters.as_of) params.set('as_of', agingFilters.as_of)
    api.get<{ receivable: { party_id: number; party_name: string; total: number; current: number; 30: number; 60: number; 90: number; over90: number }[]; payable: { party_id: number; party_name: string; total: number; current: number; 30: number; 60: number; 90: number; over90: number }[] }>(`/reports/aging/?${params}`)
      .then(setAgingData)
      .catch(() => setAgingData(null))
      .finally(() => setAgingLoading(false))
  }

  const loadProfitability = () => {
    setProfitLoading(true)
    const params = new URLSearchParams()
    if (profitFilters.branch) params.set('branch', profitFilters.branch)
    if (profitFilters.date_from) params.set('date_from', profitFilters.date_from)
    if (profitFilters.date_to) params.set('date_to', profitFilters.date_to)
    api.get<{ rows: ProfitRow[]; summary: { total_revenue: number; total_cost: number; total_profit: number } }>(`/reports/profitability/?${params}`)
      .then((res) => setProfitability(res))
      .catch(() => setProfitability(null))
      .finally(() => setProfitLoading(false))
  }

  useEffect(() => {
    const load = async () => {
      try {
        const [prods, cats, part, sales, purch, bRes] = await Promise.all([
          api.get<{ results: unknown[]; count?: number }>('/inventory/products/'),
          api.get<{ results: unknown[]; count?: number }>('/inventory/categories/'),
          api.get<{ results: unknown[]; count?: number }>('/core/parties/'),
          api.get<{ results: unknown[]; count?: number }>('/sales/sales/'),
          api.get<{ results: unknown[]; count?: number }>('/purchases/purchases/'),
          api.get<{ results: { id: number; name: string }[] }>('/core/branches/'),
        ])
        const count = (r: unknown) => (Array.isArray(r) ? r.length : (r as { results?: unknown[] }).results?.length ?? (r as { count?: number }).count ?? 0)
        setSummary({
          products: count(prods),
          categories: count(cats),
          parties: count(part),
          sales: count(sales),
          purchases: count(purch),
        })
        setBranches(Array.isArray(bRes) ? bRes : (bRes as { results?: { id: number; name: string }[] }).results || [])
      } catch {
        setSummary({ products: 0, categories: 0, parties: 0, sales: 0, purchases: 0 })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <div className="page">جاري التحميل...</div>

  return (
    <div className="page">
      <h1>التقارير</h1>
      <section className="report-cards">
        <div className="report-card">
          <span className="report-value">{summary?.products ?? 0}</span>
          <span className="report-label">المنتجات</span>
        </div>
        <div className="report-card">
          <span className="report-value">{summary?.categories ?? 0}</span>
          <span className="report-label">الفئات</span>
        </div>
        <div className="report-card">
          <span className="report-value">{summary?.parties ?? 0}</span>
          <span className="report-label">العملاء والموردون</span>
        </div>
        <div className="report-card">
          <span className="report-value">{summary?.sales ?? 0}</span>
          <span className="report-label">فواتير المبيعات</span>
        </div>
        <div className="report-card">
          <span className="report-value">{summary?.purchases ?? 0}</span>
          <span className="report-label">فواتير المشتريات</span>
        </div>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>منحنى المبيعات</h2>
        <div className="chart-card">
          <SalesTrendChart days={30} />
        </div>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>أكثر المنتجات ربحاً</h2>
        <div className="chart-card">
          <TopProductsChart limit={10} />
        </div>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>التوقعات النقدية</h2>
        <CashFlowSummary />
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>تقرير الربحية</h2>
        <div className="form-row" style={{ marginBottom: '1rem' }}>
          <div className="form-group">
            <label>الفرع</label>
            <select value={profitFilters.branch} onChange={(e) => setProfitFilters({ ...profitFilters, branch: e.target.value })}>
              <option value="">الكل</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>من تاريخ</label>
            <input type="date" value={profitFilters.date_from} onChange={(e) => setProfitFilters({ ...profitFilters, date_from: e.target.value })} />
          </div>
          <div className="form-group">
            <label>إلى تاريخ</label>
            <input type="date" value={profitFilters.date_to} onChange={(e) => setProfitFilters({ ...profitFilters, date_to: e.target.value })} />
          </div>
          <div className="form-group">
            <label>&nbsp;</label>
            <button type="button" className="btn btn-primary" onClick={loadProfitability} disabled={profitLoading}>
              {profitLoading ? 'جاري...' : 'عرض'}
            </button>
          </div>
        </div>
        {profitability && (
          <>
            <div className="report-cards" style={{ marginBottom: '1rem' }}>
              <div className="report-card">
                <span className="report-value">{profitability.summary.total_revenue.toFixed(2)}</span>
                <span className="report-label">إجمالي الإيرادات</span>
              </div>
              <div className="report-card">
                <span className="report-value">{profitability.summary.total_cost.toFixed(2)}</span>
                <span className="report-label">إجمالي التكلفة</span>
              </div>
              <div className="report-card">
                <span className="report-value" style={{ color: profitability.summary.total_profit >= 0 ? 'var(--primary-600)' : '#dc2626' }}>
                  {profitability.summary.total_profit.toFixed(2)}
                </span>
                <span className="report-label">صافي الربح</span>
              </div>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>المنتج</th>
                    <th>الفئة</th>
                    <th>الفرع</th>
                    <th>الفاتورة</th>
                    <th>الكمية</th>
                    <th>الإيراد</th>
                    <th>التكلفة</th>
                    <th>الربح</th>
                  </tr>
                </thead>
                <tbody>
                  {profitability.rows.map((r, i) => (
                    <tr key={i}>
                      <td>{r.product_name}</td>
                      <td>{r.category_name}</td>
                      <td>{r.branch_name}</td>
                      <td>{r.sale_number}</td>
                      <td>{r.quantity}</td>
                      <td>{r.revenue.toFixed(2)}</td>
                      <td>{r.cost.toFixed(2)}</td>
                      <td>{r.profit.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>تقرير Aging - المستحقات والمطلوبات حسب العمر</h2>
        <div className="form-row" style={{ marginBottom: '1rem' }}>
          <div className="form-group">
            <label>الفرع</label>
            <select value={agingFilters.branch} onChange={(e) => setAgingFilters({ ...agingFilters, branch: e.target.value })}>
              <option value="">الكل</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>حتى تاريخ</label>
            <input type="date" value={agingFilters.as_of} onChange={(e) => setAgingFilters({ ...agingFilters, as_of: e.target.value })} />
          </div>
          <div className="form-group">
            <label>&nbsp;</label>
            <button type="button" className="btn btn-primary" onClick={loadAging} disabled={agingLoading}>
              {agingLoading ? 'جاري...' : 'عرض'}
            </button>
          </div>
        </div>
        {agingData && (
          <div className="table-wrap" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h3>المستحقات (عملاء)</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>العميل</th>
                    <th>الإجمالي</th>
                    <th>جاري</th>
                    <th>1-30 يوم</th>
                    <th>31-60 يوم</th>
                    <th>61-90 يوم</th>
                    <th>أكثر من 90</th>
                  </tr>
                </thead>
                <tbody>
                  {agingData.receivable.map((r) => (
                    <tr key={r.party_id}>
                      <td>{r.party_name}</td>
                      <td>{r.total.toFixed(2)}</td>
                      <td>{r.current.toFixed(2)}</td>
                      <td>{r['30'].toFixed(2)}</td>
                      <td>{r['60'].toFixed(2)}</td>
                      <td>{r['90'].toFixed(2)}</td>
                      <td>{r.over90.toFixed(2)}</td>
                    </tr>
                  ))}
                  {agingData.receivable.length === 0 && <tr><td colSpan={7}>لا توجد مستحقات</td></tr>}
                </tbody>
              </table>
            </div>
            <div>
              <h3>المطلوبات (موردين)</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>المورد</th>
                    <th>الإجمالي</th>
                    <th>جاري</th>
                    <th>1-30 يوم</th>
                    <th>31-60 يوم</th>
                    <th>61-90 يوم</th>
                    <th>أكثر من 90</th>
                  </tr>
                </thead>
                <tbody>
                  {agingData.payable.map((r) => (
                    <tr key={r.party_id}>
                      <td>{r.party_name}</td>
                      <td>{r.total.toFixed(2)}</td>
                      <td>{r.current.toFixed(2)}</td>
                      <td>{r['30'].toFixed(2)}</td>
                      <td>{r['60'].toFixed(2)}</td>
                      <td>{r['90'].toFixed(2)}</td>
                      <td>{r.over90.toFixed(2)}</td>
                    </tr>
                  ))}
                  {agingData.payable.length === 0 && <tr><td colSpan={7}>لا توجد مطلوبات</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <p className="report-note" style={{ marginTop: '1.5rem' }}>الفترات المالية تُدار من لوحة الإدارة. التقارير المالية التفصيلية متاحة من لوحة الإدارة.</p>
    </div>
  )
}
