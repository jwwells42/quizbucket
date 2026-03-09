import { useState, useCallback } from 'react'

const STORAGE_KEY = 'quizbucket-progress'

function loadProgress() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : {}
  } catch {
    return {}
  }
}

function saveProgress(progress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
}

export function useProgress() {
  const [progress, setProgress] = useState(loadProgress)

  const markCard = useCallback((deckId, cardIndex, known) => {
    setProgress(prev => {
      const next = { ...prev }
      if (!next[deckId]) next[deckId] = {}
      next[deckId][cardIndex] = {
        known,
        lastSeen: Date.now(),
        timesReviewed: ((prev[deckId]?.[cardIndex]?.timesReviewed) || 0) + 1,
      }
      saveProgress(next)
      return next
    })
  }, [])

  const getCardStatus = useCallback((deckId, cardIndex) => {
    return progress[deckId]?.[cardIndex] || null
  }, [progress])

  const getDeckStats = useCallback((deckId) => {
    const deckProgress = progress[deckId] || {}
    const entries = Object.values(deckProgress)
    return {
      total: entries.length,
      known: entries.filter(e => e.known).length,
      learning: entries.filter(e => !e.known).length,
    }
  }, [progress])

  const recordTossup = useCallback((correct) => {
    setProgress(prev => {
      const next = { ...prev }
      if (!next._tossups) next._tossups = { correct: 0, total: 0 }
      next._tossups = {
        correct: next._tossups.correct + (correct ? 1 : 0),
        total: next._tossups.total + 1,
      }
      saveProgress(next)
      return next
    })
  }, [])

  const getTossupStats = useCallback(() => {
    return progress._tossups || { correct: 0, total: 0 }
  }, [progress])

  const recordLightning = useCallback((setId, correct, total) => {
    setProgress(prev => {
      const next = { ...prev }
      if (!next._lightning) next._lightning = {}
      const existing = next._lightning[setId]
      next._lightning[setId] = {
        lastScore: correct,
        lastTotal: total,
        bestScore: Math.max(correct, existing?.bestScore || 0),
        timesPlayed: (existing?.timesPlayed || 0) + 1,
      }
      saveProgress(next)
      return next
    })
  }, [])

  const getLightningStats = useCallback(() => {
    return progress._lightning || {}
  }, [progress])

  const getRecentActivity = useCallback(() => {
    const activity = []

    // Flashcard activity
    for (const [deckId, cards] of Object.entries(progress)) {
      if (deckId.startsWith('_')) continue
      const entries = Object.values(cards)
      if (entries.length === 0) continue
      const lastSeen = Math.max(...entries.map(e => e.lastSeen))
      activity.push({ type: 'flashcards', deckId, lastSeen })
    }

    // Tossup activity
    if (progress._tossups?.total > 0) {
      activity.push({ type: 'tossups', lastSeen: Date.now() })
    }

    // Lightning activity
    if (progress._lightning) {
      for (const [setId, data] of Object.entries(progress._lightning)) {
        activity.push({ type: 'lightning', setId, lastSeen: Date.now(), ...data })
      }
    }

    return activity.sort((a, b) => b.lastSeen - a.lastSeen)
  }, [progress])

  return {
    markCard,
    getCardStatus,
    getDeckStats,
    recordTossup,
    getTossupStats,
    recordLightning,
    getLightningStats,
    getRecentActivity,
  }
}
