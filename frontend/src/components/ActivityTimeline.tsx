import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { IconShoppingCart, IconWallet, IconPackage } from './icons'

interface Activity {
  type: string
  title: string
  description: string
  date: string
  link: string
  user: string
}

export default function ActivityTimeline() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<{ activities?: Activity[] }>('/reports/activity/?limit=30')
      .then((r) => setActivities(r.activities || []))
      .catch(() => setActivities([]))
      .finally(() => setLoading(false))
  }, [])

  const formatDate = (iso: string) => {
    if (!iso) return ''
    const d = new Date(iso)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    if (diff < 60000) return 'الآن'
    if (diff < 3600000) return `منذ ${Math.floor(diff / 60000)} دقيقة`
    if (diff < 86400000) return `منذ ${Math.floor(diff / 3600000)} ساعة`
    return d.toLocaleDateString('ar-EG')
  }

  const Icon = (type: string) => {
    if (type === 'sale') return IconShoppingCart
    if (type === 'payment') return IconWallet
    return IconPackage
  }

  if (loading) return <div className="activity-timeline-loading">جاري التحميل...</div>
  if (activities.length === 0) return <div className="activity-timeline-empty">لا يوجد نشاط</div>

  return (
    <div className="activity-timeline">
      {activities.map((a, i) => {
        const IconC = Icon(a.type)
        return (
          <Link key={i} to={a.link} className="activity-timeline-item">
            <div className="activity-timeline-icon">
              <IconC size={16} />
            </div>
            <div className="activity-timeline-content">
              <span className="activity-timeline-title">{a.title}</span>
              <span className="activity-timeline-desc">{a.description}</span>
              <span className="activity-timeline-meta">{formatDate(a.date)}{a.user !== '-' ? ` • ${a.user}` : ''}</span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
