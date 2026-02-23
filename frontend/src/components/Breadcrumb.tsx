import { Link, useLocation } from 'react-router-dom'

const pathLabels: Record<string, string> = {
  '/': 'الرئيسية',
  '/products': 'المنتجات',
  '/categories': 'الفئات',
  '/parties': 'العملاء والموردون',
  '/sales': 'المبيعات',
  '/purchases': 'المشتريات',
  '/treasury': 'الخزينة',
  '/advances': 'العهد والسلف',
  '/journal': 'القيود اليومية',
  '/maintenance': 'الصيانة',
  '/warehouse': 'المخزن',
  '/reports': 'التقارير',
  '/activity': 'سجل النشاط',
}

export default function Breadcrumb() {
  const location = useLocation()
  const paths = location.pathname.split('/').filter(Boolean)

  const segments: { path: string; label: string }[] = [{ path: '/', label: 'الرئيسية' }]
  let currentPath = ''
  for (const segment of paths) {
    currentPath += `/${segment}`
    segments.push({
      path: currentPath,
      label: pathLabels[currentPath] || segment,
    })
  }

  return (
    <nav className="breadcrumb" aria-label="مسار التنقل">
      {segments.map((seg, i) => (
        <span key={seg.path} className="breadcrumb-segment">
          {i > 0 && <span className="breadcrumb-sep">/</span>}
          {i === segments.length - 1 ? (
            <span className="breadcrumb-current">{seg.label}</span>
          ) : (
            <Link to={seg.path} className="breadcrumb-link">{seg.label}</Link>
          )}
        </span>
      ))}
    </nav>
  )
}
