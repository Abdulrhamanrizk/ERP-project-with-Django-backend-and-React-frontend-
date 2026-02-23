import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'

interface User {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  organization_id: number | null
  default_branch_id: number | null
  preferred_language: string
  role?: string
  is_superuser?: boolean
  branch_ids?: number[] | null  // null = all branches; list = restricted
}

interface AuthState {
  token: string | null
  refresh: string | null
  user: User | null
}

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  setToken: (token: string, refresh: string, user: User) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

const STORAGE_KEY = 'erp_auth'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        return {
          token: parsed.token || null,
          refresh: parsed.refresh || null,
          user: parsed.user || null,
        }
      }
    } catch {}
    return { token: null, refresh: null, user: null }
  })

  useEffect(() => {
    if (state.token) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [state.token, state.refresh, state.user])

  const login = useCallback(async (username: string, password: string) => {
    try {
    const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
    const url = apiBase ? `${apiBase}/api/auth/login/` : '/api/auth/login/'
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    const text = await res.text()
    let data: Record<string, unknown> = {}
    try {
      data = text ? JSON.parse(text) : {}
    } catch {
      const hint = res.ok
        ? 'الخادم يرجع HTML بدلاً من JSON. جرّب VITE_API_URL=http://localhost:8001 في .env'
        : 'تأكد أن الـ Backend يعمل: backend\\run.bat (المنفذ 8001)'
      throw new Error(hint)
    }
    if (!res.ok) {
      const err = data as { detail?: string; password?: string[] }
      throw new Error(err.detail || err.password?.[0] || 'فشل تسجيل الدخول')
    }
    const payload = data as { access: string; refresh: string; user: User }
    const newState = {
      token: payload.access,
      refresh: payload.refresh,
      user: payload.user,
    }
    setState(newState)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState))
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('fetch') || msg.includes('network') || msg.includes('Failed')) {
        throw new Error('تعذر الاتصال. شغّل backend\\run.bat (المنفذ 8001)')
      }
      throw e
    }
  }, [])

  const logout = useCallback(() => {
    setState({ token: null, refresh: null, user: null })
  }, [])

  const setToken = useCallback((token: string, refresh: string, user: User) => {
    setState({ token, refresh, user })
  }, [])

  return (
    <AuthContext.Provider value={{ ...state, login, logout, setToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
