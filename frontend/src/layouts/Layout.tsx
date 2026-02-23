import { useState, useCallback, useEffect, useRef } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../store/AuthContext'
import { useBranch } from '../store/BranchContext'
import { useToast } from '../store/ToastContext'
import Breadcrumb from '../components/Breadcrumb'
import CommandPalette from '../components/CommandPalette'
import QuickActionsBar from '../components/QuickActionsBar'
import ShortcutsHelp from '../components/ShortcutsHelp'
import AlertsDropdown from '../components/AlertsDropdown'
import { useShortcuts } from '../store/ShortcutsContext'
import {
  IconHome,
  IconPackage,
  IconTag,
  IconUsers,
  IconShoppingCart,
  IconCreditCard,
  IconWallet,
  IconBookOpen,
  IconWrench,
  IconWarehouse,
  IconBarChart,
  IconChevronRight,
  IconChevronLeft,
  IconMenu,
  IconSearch,
  IconExternalLink,
} from '../components/icons'

interface LayoutProps {
  children: React.ReactNode
}

const navGroups = [
  {
    label: 'الرئيسية',
    items: [{ to: '/', label: 'لوحة التحكم', icon: IconHome }],
  },
  {
    label: 'المخزون',
    items: [
      { to: '/products', label: 'المنتجات', icon: IconPackage },
      { to: '/categories', label: 'الفئات', icon: IconTag },
      { to: '/warehouse', label: 'المخزن', icon: IconWarehouse },
    ],
  },
  {
    label: 'المبيعات والمشتريات',
    items: [
      { to: '/parties', label: 'العملاء والموردون', icon: IconUsers },
      { to: '/sales', label: 'المبيعات', icon: IconShoppingCart },
      { to: '/purchases', label: 'المشتريات', icon: IconCreditCard },
    ],
  },
  {
    label: 'المالية',
    items: [
      { to: '/treasury', label: 'الخزينة', icon: IconWallet },
      { to: '/advances', label: 'العهد والسلف', icon: IconBookOpen },
      { to: '/journal', label: 'القيود اليومية', icon: IconBookOpen },
    ],
  },
  {
    label: 'نظام',
    items: [
      { to: '/maintenance', label: 'الصيانة', icon: IconWrench },
      { to: '/reports', label: 'التقارير', icon: IconBarChart },
      { to: '/activity', label: 'سجل النشاط', icon: IconBookOpen },
    ],
  },
]

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth()
  const { currentBranchId, setCurrentBranchId } = useBranch()
  const { showToast } = useToast()
  const { commandPaletteOpen, setCommandPaletteOpen, shortcutsHelpOpen, setShortcutsHelpOpen } = useShortcuts()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([])
  const prevBranchRef = useRef<number | null>(currentBranchId)

  useEffect(() => {
    api.get<{ results: { id: number; name: string }[] }>('/core/branches/')
      .then((r) => setBranches(Array.isArray(r) ? r : (r as { results?: unknown[] }).results || []))
      .catch(() => {})
  }, [])

  const handleBranchChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    const id = val ? Number(val) : null
    const prevId = prevBranchRef.current
    prevBranchRef.current = id
    setCurrentBranchId(id)
    if (id && branches.length) {
      const branch = branches.find((b) => b.id === id)
      if (branch) showToast(`تم التبديل إلى فرع ${branch.name}`)
    }
  }, [setCurrentBranchId, showToast, branches])

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((c) => !c)
  }, [])

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false)
  }, [])

  return (
    <div className={`app-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${mobileMenuOpen ? 'mobile-menu-open' : ''}`}>
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <Link to="/" className="logo">
            <span className="logo-icon">ERP</span>
            {!sidebarCollapsed && <span className="logo-text">نظام ERP</span>}
          </Link>
          <button type="button" className="sidebar-toggle" onClick={toggleSidebar} title={sidebarCollapsed ? 'توسيع' : 'طي'}>
            {sidebarCollapsed ? <IconChevronLeft size={18} /> : <IconChevronRight size={18} />}
          </button>
        </div>
        <nav className="sidebar-nav">
          {navGroups.map((group) => (
            <div key={group.label} className="nav-group">
              {!sidebarCollapsed && <div className="nav-group-label">{group.label}</div>}
              <ul>
                {group.items.map((item) => {
                  const Icon = item.icon
                  const isActive = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.to === '/'}
                        className={({ isActive }) => (isActive ? 'active' : '')}
                        onClick={closeMobileMenu}
                      >
                        <Icon size={20} className="nav-icon" />
                        {!sidebarCollapsed && <span>{item.label}</span>}
                        {sidebarCollapsed && <span className="tooltip">{item.label}</span>}
                      </NavLink>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
          <div className="nav-group">
            {!sidebarCollapsed && <div className="nav-group-label">إدارة</div>}
            <ul>
              <li>
                <a href="http://127.0.0.1:8001/admin/" target="_blank" rel="noreferrer" onClick={closeMobileMenu}>
                  <IconExternalLink size={20} className="nav-icon" />
                  {!sidebarCollapsed && <span>لوحة الإدارة</span>}
                  {sidebarCollapsed && <span className="tooltip">لوحة الإدارة</span>}
                </a>
              </li>
            </ul>
          </div>
        </nav>
      </aside>

      {/* Mobile overlay */}
      <div className="sidebar-overlay" onClick={closeMobileMenu} aria-hidden="true" />

      {/* Main area */}
      <div className="main-area">
        {/* Topbar */}
        <header className="topbar">
          <button type="button" className="topbar-mobile-menu" onClick={() => setMobileMenuOpen(true)} aria-label="فتح القائمة">
            <IconMenu size={24} />
          </button>
          <div className="topbar-search" onClick={() => setCommandPaletteOpen(true)}>
            <IconSearch size={18} />
            <span>بحث...</span>
          </div>
          <div className="topbar-actions">
            <div className={`topbar-branch branch-select-wrapper ${currentBranchId ? 'has-branch' : ''}`}>
              <select
                value={currentBranchId ?? ''}
                onChange={handleBranchChange}
                className="branch-select"
              >
                <option value="">كل الفروع</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <AlertsDropdown />
            <div className="topbar-user">
              <div className="user-avatar">{user?.first_name?.[0] || user?.username?.[0] || '?'}</div>
              <div className="user-info">
                <span className="user-name">{user?.first_name || user?.username}</span>
                <span className="user-role">{user?.is_superuser || user?.role === 'manager' ? 'مدير' : user?.role === 'accountant' ? 'محاسب' : user?.role === 'cashier' ? 'كاشير' : user?.role === 'warehouse' ? 'مخزن' : 'مستخدم'}</span>
              </div>
            </div>
            <button type="button" className="topbar-logout" onClick={logout} title="تسجيل الخروج">
              خروج
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="content">
          <Breadcrumb />
          {children}
        </main>
      </div>
      <CommandPalette open={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
      <ShortcutsHelp open={shortcutsHelpOpen} onClose={() => setShortcutsHelpOpen(false)} />
      <QuickActionsBar />
    </div>
  )
}
