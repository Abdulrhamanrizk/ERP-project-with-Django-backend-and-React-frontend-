import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { api } from '../../api/client'

interface ProductRow {
  product_name: string
  revenue: number
  profit: number
  quantity: number
}

interface TopProductsChartProps {
  branch?: string
  limit?: number
}

export default function TopProductsChart({ branch = '', limit = 10 }: TopProductsChartProps) {
  const [data, setData] = useState<ProductRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const to = new Date().toISOString().slice(0, 10)
    const from = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const params = new URLSearchParams({ date_from: from, date_to: to, limit: String(limit) })
    if (branch) params.set('branch', branch)
    api.get<{ data: ProductRow[] }>(`/reports/top-products/?${params}`)
      .then((r) => setData(r.data || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }, [branch, limit])

  if (loading) return <div className="chart-loading">جاري التحميل...</div>
  if (data.length === 0) return <div className="chart-empty">لا توجد بيانات</div>

  const chartData = data.map((d) => ({
    name: d.product_name.length > 15 ? d.product_name.slice(0, 15) + '...' : d.product_name,
    fullName: d.product_name,
    profit: d.profit,
    revenue: d.revenue,
  }))

  return (
    <div className="chart-container" style={{ width: '100%', height: 280 }}>
      <ResponsiveContainer>
        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
          <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => v.toLocaleString('ar-EG')} />
          <YAxis type="category" dataKey="name" width={75} tick={{ fontSize: 10 }} />
          <Tooltip
            formatter={(v: number) => [v.toLocaleString('ar-EG', { minimumFractionDigits: 2 }), 'الربح']}
            contentStyle={{ direction: 'rtl' }}
            labelFormatter={(_, payload) => payload[0]?.payload?.fullName}
          />
          <Bar dataKey="profit" fill="var(--primary-500)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
