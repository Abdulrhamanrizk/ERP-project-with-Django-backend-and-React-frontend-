import React, { createContext, useContext, useState, useCallback } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'

interface ShortcutsContextType {
  commandPaletteOpen: boolean
  setCommandPaletteOpen: (v: boolean) => void
  shortcutsHelpOpen: boolean
  setShortcutsHelpOpen: (v: boolean) => void
}

const ShortcutsContext = createContext<ShortcutsContextType | null>(null)

export function ShortcutsProvider({ children }: { children: React.ReactNode }) {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false)

  useHotkeys('mod+k', (e) => {
    e.preventDefault()
    setCommandPaletteOpen(true)
  })
  useHotkeys('mod+/', (e) => {
    e.preventDefault()
    setShortcutsHelpOpen(true)
  })

  return (
    <ShortcutsContext.Provider
      value={{
        commandPaletteOpen,
        setCommandPaletteOpen,
        shortcutsHelpOpen,
        setShortcutsHelpOpen,
      }}
    >
      {children}
    </ShortcutsContext.Provider>
  )
}

export function useShortcuts() {
  const ctx = useContext(ShortcutsContext)
  if (!ctx) throw new Error('useShortcuts must be used within ShortcutsProvider')
  return ctx
}
