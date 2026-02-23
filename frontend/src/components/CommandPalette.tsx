import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import {
  IconSearch,
  IconPackage,
  IconUsers,
  IconShoppingCart,
  IconCreditCard,
  IconX,
} from './icons'

interface SearchResults {
  products: { id: number; name: string; sku: string }[]
  parties: { id: number; name: string; code: string; is_customer: boolean; is_supplier: boolean }[]
  sales: { id: number; sale_number: string; total: string; sale_date: string }[]
  purchases: { id: number; purchase_number: string; total: string; purchase_date: string }[]
}

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const allItems: { type: string; label: string; path: string; sub?: string }[] = []
  if (results) {
    results.products.forEach((p) =>
      allItems.push({ type: 'product', label: p.name, path: `/products`, sub: p.sku ? `[${p.sku}]` : undefined })
    )
    results.parties.forEach((p) => {
      const role = p.is_customer && p.is_supplier ? 'عميل/مورد' : p.is_customer ? 'عميل' : 'مورد'
      allItems.push({ type: 'party', label: p.name, path: `/parties`, sub: role })
    })
    results.sales.forEach((s) =>
      allItems.push({ type: 'sale', label: s.sale_number, path: `/sales`, sub: `${s.total} ج.م` })
    )
    results.purchases.forEach((p) =>
      allItems.push({ type: 'purchase', label: p.purchase_number, path: `/purchases`, sub: `${p.total} ج.م` })
    )
  }

  const selectedItem = allItems[selectedIndex]

  const search = useCallback(async (q: string) => {
    if (!q || q.length < 2) {
      setResults(null)
      return
    }
    setLoading(true)
    try {
      const res = await api.get<SearchResults>(`/reports/search/?q=${encodeURIComponent(q)}&limit=5`)
      setResults(res)
      setSelectedIndex(0)
    } catch {
      setResults(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => search(query), 300)
    return () => clearTimeout(t)
  }, [query, search])

  useEffect(() => {
    if (open) {
      setQuery('')
      setResults(null)
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, allItems.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
        return
      }
      if (e.key === 'Enter' && selectedItem) {
        e.preventDefault()
        navigate(selectedItem.path)
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose, selectedIndex, allItems, selectedItem, navigate])

  const handleSelect = (path: string) => {
    navigate(path)
    onClose()
  }

  if (!open) return null

  return (
    <div className="command-palette-overlay" onClick={onClose}>
      <div className="command-palette" onClick={(e) => e.stopPropagation()}>
        <div className="command-palette-header">
          <IconSearch size={20} className="command-palette-icon" />
          <input
            ref={inputRef}
            type="text"
            className="command-palette-input"
            placeholder="بحث..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <span className="command-palette-hint">Ctrl+K</span>
        </div>
        <div className="command-palette-results">
          {loading && <p className="command-palette-loading">جاري البحث...</p>}
          {!loading && query.length >= 2 && !results && <p className="command-palette-empty">لا توجد نتائج</p>}
          {!loading && query.length < 2 && <p className="command-palette-empty">اكتب حرفين على الأقل</p>}
          {!loading && results && allItems.length === 0 && <p className="command-palette-empty">لا توجد نتائج</p>}
          {!loading && allItems.length > 0 && (
            <div className="command-palette-list">
              {allItems.map((item, idx) => (
                <button
                  key={`${item.type}-${idx}`}
                  type="button"
                  className={`command-palette-item ${selectedIndex === idx ? 'selected' : ''}`}
                  onClick={() => handleSelect(item.path)}
                >
                  {item.type === 'product' && <IconPackage size={18} />}
                  {item.type === 'party' && <IconUsers size={18} />}
                  {item.type === 'sale' && <IconShoppingCart size={18} />}
                  {item.type === 'purchase' && <IconCreditCard size={18} />}
                  <span>{item.label}</span>
                  {item.sub && <span className="command-palette-sub">{item.sub}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
