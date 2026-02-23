import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useAuth } from './AuthContext'

const STORAGE_KEY = 'erp_current_branch'

interface BranchContextType {
  currentBranchId: number | null
  setCurrentBranchId: (id: number | null) => void
}

const BranchContext = createContext<BranchContextType | null>(null)

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [currentBranchId, setCurrentBranchIdState] = useState<number | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const n = parseInt(stored, 10)
        if (!isNaN(n)) return n
      }
    } catch {}
    return user?.default_branch_id ?? null
  })

  useEffect(() => {
    if (!user) return
    const ids = user.branch_ids
    if (ids && ids.length > 0 && currentBranchId !== null && !ids.includes(currentBranchId)) {
      setCurrentBranchIdState(ids[0])
      localStorage.setItem(STORAGE_KEY, String(ids[0]))
    } else if (currentBranchId === null && user.default_branch_id) {
      const allowed = !ids || ids.includes(user.default_branch_id)
      if (allowed) setCurrentBranchIdState(user.default_branch_id)
      else if (ids?.length) setCurrentBranchIdState(ids[0])
    }
  }, [user, currentBranchId])

  const setCurrentBranchId = useCallback((id: number | null) => {
    setCurrentBranchIdState(id)
    if (id !== null) {
      localStorage.setItem(STORAGE_KEY, String(id))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
    window.dispatchEvent(new CustomEvent('erp-branch-changed', { detail: { branchId: id } }))
  }, [])

  return (
    <BranchContext.Provider value={{ currentBranchId, setCurrentBranchId }}>
      {children}
    </BranchContext.Provider>
  )
}

export function useBranch() {
  const ctx = useContext(BranchContext)
  if (!ctx) throw new Error('useBranch must be used within BranchProvider')
  return ctx
}
