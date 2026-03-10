import { createContext, useContext, useState, useCallback } from 'react'

export const ALL_LEVELS = ['3/4', '5/6', '7-9', '9-12']

export const LEVEL_LABELS = {
  '3/4': 'Grades 3-4',
  '5/6': 'Grades 5-6',
  '7-9': 'Jr. High',
  '9-12': 'Sr. High',
}

const STORAGE_KEY = 'quizbucket-level'

const LevelContext = createContext()

export function LevelProvider({ children }) {
  const [level, setLevelState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || null
    } catch {
      return null
    }
  })

  const setLevel = useCallback((newLevel) => {
    setLevelState(newLevel)
    try {
      if (newLevel) {
        localStorage.setItem(STORAGE_KEY, newLevel)
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
    } catch {}
  }, [])

  const filterByLevel = useCallback((items) => {
    if (!level) return items
    return items.filter(item => item.levels && item.levels.includes(level))
  }, [level])

  return (
    <LevelContext.Provider value={{ level, setLevel, filterByLevel }}>
      {children}
    </LevelContext.Provider>
  )
}

export function useLevel() {
  const context = useContext(LevelContext)
  if (!context) throw new Error('useLevel must be used within a LevelProvider')
  return context
}
