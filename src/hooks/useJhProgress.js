import { useState, useCallback } from 'react'

const STORAGE_KEY = 'quizbucket-jh-progress'

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}
  } catch {
    return {}
  }
}

// Scores for the JH packet practice. Keys look like "p3-q1" (packet 3,
// quarter 1), "p3-l0" (packet 3, first lightning set) or "mixed-tossups".
// Recording again with the same roundId (e.g. after an "I was right"
// override) updates that round instead of counting a new play.
export function useJhProgress() {
  const [progress, setProgress] = useState(loadProgress)

  const recordRound = useCallback((key, roundId, result) => {
    setProgress(prev => {
      const existing = prev[key]
      const sameRound = existing?.roundId === roundId
      const bestBefore = sameRound ? existing.bestBefore : (existing?.best ?? 0)
      const score = result.points ?? result.correct
      if (sameRound && Object.keys(result).every(k => existing[k] === result[k])) return prev
      const next = {
        ...prev,
        [key]: {
          ...result,
          roundId,
          bestBefore,
          best: Math.max(bestBefore, score),
          plays: (existing?.plays || 0) + (sameRound ? 0 : 1),
        },
      }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* storage unavailable */ }
      return next
    })
  }, [])

  return { progress, recordRound }
}
