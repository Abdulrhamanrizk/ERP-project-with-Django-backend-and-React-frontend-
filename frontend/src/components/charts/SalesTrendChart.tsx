import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { api } from '../../api/client'

interface DataPoint {
  date: string
  total: number
}

interface SalesTrendChartProps {
  branch?: string
  days?: number
}

export default function SalesTrendChart({ branch = '', days = 30 }: SalesTrendChartProps) {
  const [data, setData] = useState<DataPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const to = new Date().toISOString().slice(0, 10)
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const params = new URLSearchParams({ date_from: from, date_to: to })
    if (branch) params.set('branch', branch)
    api.get<{ data: DataPoint[] }>(`/reports/sales-trend/?${params}`)
      .then((r) => setData(r.data || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }, [branch, days])

  if (loading) return <div className="chart-loading">جاري التحميل...</div>
  if (data.length === 0) return <div className="chart-empty">لا توجد بيانات</div>

  return (
    <div className="chart-container" style={{ width: '100%', height: 280 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}`} />
          <Tooltip
            formatter={(v: number) => [v.toLocaleString('ar-EG', { minimumFractionDigits: 2 }), 'المبيعات']}
            contentStyle={{ direction: 'rtl' }}
          />
          <Line type="monotone" dataKey="total" stroke="var(--primary-500)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
