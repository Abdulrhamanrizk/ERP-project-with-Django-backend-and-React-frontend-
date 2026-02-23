import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { IconBell } from './icons'

interface Alert {
  type: string
  priority: string
  title: string
  description: string
  link: string
  created_at: string
}

interface AlertsResponse {
  alerts: Alert[]
  count: number
}

export default function AlertsDropdown() {
  const [open, setOpen] = useState(false)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const load = useCallback(() => {
    setLoading(true)
    api.get<AlertsResponse>('/reports/alerts/')
      .then((r) => setAlerts(r.alerts || []))
      .catch(() => setAlerts([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (open) load()
  }, [open, load])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const priorityClass = (p: string) => {
    if (p === 'high') return 'alert-priority-high'
    if (p === 'medium') return 'alert-priority-medium'
    return 'alert-priority-low'
  }

  return (
    <div className="alerts-dropdown-wrapper" ref={containerRef}>
      <button
        type="button"
        className={`topbar-icon-btn alerts-trigger ${alerts.length > 0 ? 'has-alerts' : ''}`}
        onClick={() => setOpen(!open)}
        title="التنبيهات"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <IconBell size={20} />
        {alerts.length > 0 && (
          <span className="alerts-badge">{alerts.length > 9 ? '9+' : alerts.length}</span>
        )}
      </button>
      {open && (
        <div className="alerts-dropdown" role="menu">
          <div className="alerts-dropdown-header">
            <span>التنبيهات</span>
            {alerts.length > 0 && <span className="alerts-count">{alerts.length}</span>}
          </div>
          <div className="alerts-dropdown-body">
            {loading ? (
              <div className="alerts-loading">جاري التحميل...</div>
            ) : alerts.length === 0 ? (
              <div className="alerts-empty">لا توجد تنبيهات</div>
            ) : (
              <ul className="alerts-list">
                {alerts.map((a, i) => (
                  <li key={`${a.type}-${i}`} className={`alert-item ${priorityClass(a.priority)}`}>
                    <Link to={a.link} onClick={() => setOpen(false)} className="alert-link">
                      <span className="alert-title">{a.title}</span>
                      <span className="alert-desc">{a.description}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
