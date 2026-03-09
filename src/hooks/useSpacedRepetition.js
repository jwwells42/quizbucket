import { useMemo } from 'react'

export function useSpacedRepetition(cards, deckId, getCardStatus) {
  return useMemo(() => {
    if (!cards || cards.length === 0) return []

    const scored = cards.map((card, index) => {
      const status = getCardStatus(deckId, index)
      let priority = 1

      if (!status) {
        // Never seen — high priority
        priority = 3
      } else if (!status.known) {
        // Marked "still learning" — highest priority
        priority = 5
      } else {
        // Known — low priority, but increases over time
        const hoursSince = (Date.now() - status.lastSeen) / (1000 * 60 * 60)
        priority = Math.min(0.5 + hoursSince / 24, 2)
      }

      return { card, index, priority }
    })

    // Sort by priority descending, with some randomization within similar priorities
    scored.sort((a, b) => {
      const diff = b.priority - a.priority
      if (Math.abs(diff) < 0.5) return Math.random() - 0.5
      return diff
    })

    return scored.map(s => ({ ...s.card, originalIndex: s.index }))
  }, [cards, deckId, getCardStatus])
}
