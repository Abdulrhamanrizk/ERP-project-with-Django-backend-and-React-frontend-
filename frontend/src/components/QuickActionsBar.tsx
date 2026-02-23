import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconPlus, IconShoppingCart, IconCreditCard, IconWallet, IconPackage } from './icons'

const actions = [
  { label: 'فاتورة مبيعات', path: '/sales', icon: IconShoppingCart, state: { openAddModal: true } },
  { label: 'فاتورة مشتريات', path: '/purchases', icon: IconCreditCard, state: { openAddModal: true } },
  { label: 'سند قبض', path: '/treasury', icon: IconWallet, state: { openAddModal: 'receipt' } },
  { label: 'منتج جديد', path: '/products', icon: IconPackage, state: { openAddModal: true } },
]

export default function QuickActionsBar() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const handleAction = (a: (typeof actions)[0]) => {
    navigate(a.path, { state: a.state })
    setOpen(false)
  }

  return (
    <div className="quick-actions-bar">
      {open && (
        <div className="quick-actions-menu">
          {actions.map((a) => {
            const Icon = a.icon
            return (
              <button
                key={a.path}
                type="button"
                className="quick-actions-menu-item"
                onClick={() => handleAction(a)}
              >
                <Icon size={18} />
                <span>{a.label}</span>
              </button>
            )
          })}
        </div>
      )}
      <button
        type="button"
        className="quick-actions-fab"
        onClick={() => setOpen(!open)}
        title="إجراءات سريعة"
        aria-label="إجراءات سريعة"
      >
        <IconPlus size={24} />
      </button>
    </div>
  )
}
