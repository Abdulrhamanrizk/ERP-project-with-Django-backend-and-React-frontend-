import ActivityTimeline from '../components/ActivityTimeline'

export default function Activity() {
  return (
    <div className="page">
      <h1>سجل النشاط</h1>
      <p className="text-muted" style={{ marginBottom: '1.5rem' }}>آخر العمليات في النظام</p>
      <ActivityTimeline />
    </div>
  )
}
