import { useParams, Link } from 'react-router-dom'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { getDeck } from '../data/loader'
import { useProgress } from '../hooks/useProgress'

const BATCH_SIZE = 5

export default function FlashcardStudy() {
  const { category } = useParams()
  const deck = getDeck(category)
  const { markCard, getCardStatus, getDeckStats } = useProgress()

  // Track which card indices are in the active working set
  const [workingSet, setWorkingSet] = useState([])
  const [currentPos, setCurrentPos] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [initialized, setInitialized] = useState(false)

  const stats = deck ? getDeckStats(deck.id) : null

  // Categorize all cards
  const { unseen, learning, mastered } = useMemo(() => {
    if (!deck) return { unseen: [], learning: [], mastered: [] }
    const unseen = []
    const learning = []
    const mastered = []
    deck.cards.forEach((card, i) => {
      const status = getCardStatus(category, i)
      if (!status) unseen.push(i)
      else if (!status.known) learning.push(i)
      else mastered.push(i)
    })
    return { unseen, learning, mastered }
  }, [deck, category, getCardStatus])

  // Initialize working set on first load
  useEffect(() => {
    if (!deck || initialized) return

    // Start with "still learning" cards first, then fill with unseen
    const initial = []
    for (const i of learning) {
      if (initial.length >= BATCH_SIZE) break
      initial.push(i)
    }
    for (const i of unseen) {
      if (initial.length >= BATCH_SIZE) break
      initial.push(i)
    }

    setWorkingSet(initial)
    setCurrentPos(0)
    setInitialized(true)
  }, [deck, initialized, learning, unseen])

  // The current card from the working set
  const currentCardIndex = workingSet[currentPos]
  const card = deck?.cards[currentCardIndex]

  const flip = useCallback(() => setFlipped(f => !f), [])

  // Load the next batch of unseen cards
  const loadNextBatch = useCallback(() => {
    if (!deck) return
    const next = []
    for (const i of deck.cards.keys()) {
      const status = getCardStatus(category, i)
      if (!status) next.push(i)
      if (next.length >= BATCH_SIZE) break
    }
    setWorkingSet(next)
    setCurrentPos(0)
    setFlipped(false)
  }, [deck, category, getCardStatus])

  // After marking a card, figure out what happens next
  const advanceAfterMark = useCallback((markedIndex, known) => {
    setFlipped(false)

    if (known) {
      // Remove from working set — they got it, set shrinks
      const newSet = workingSet.filter(i => i !== markedIndex)
      setWorkingSet(newSet)
      // Keep position in bounds (stay at same spot to see the next card)
      setCurrentPos(prev => newSet.length === 0 ? 0 : prev >= newSet.length ? 0 : prev)
    } else {
      // "Still learning" — keep in set, move to next card
      setCurrentPos(prev =>
        workingSet.length <= 1 ? 0 : (prev + 1) % workingSet.length
      )
    }
  }, [workingSet])

  const markKnown = useCallback(() => {
    if (currentCardIndex == null) return
    markCard(category, currentCardIndex, true)
    advanceAfterMark(currentCardIndex, true)
  }, [currentCardIndex, category, markCard, advanceAfterMark])

  const markLearning = useCallback(() => {
    if (currentCardIndex == null) return
    markCard(category, currentCardIndex, false)
    advanceAfterMark(currentCardIndex, false)
  }, [currentCardIndex, category, markCard, advanceAfterMark])

  const next = useCallback(() => {
    if (workingSet.length <= 1) return
    setCurrentPos(prev => (prev + 1) % workingSet.length)
    setFlipped(false)
  }, [workingSet.length])

  const prev = useCallback(() => {
    if (workingSet.length <= 1) return
    setCurrentPos(prev => (prev - 1 + workingSet.length) % workingSet.length)
    setFlipped(false)
  }, [workingSet.length])

  useEffect(() => {
    function handleKey(e) {
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault()
        flip()
      } else if (e.key === 'ArrowRight') {
        next()
      } else if (e.key === 'ArrowLeft') {
        prev()
      } else if (e.key === '1') {
        markLearning()
      } else if (e.key === '2') {
        markKnown()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [flip, next, prev, markKnown, markLearning])

  if (!deck) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Deck not found.</p>
        <Link to="/flashcards" className="text-indigo-400 hover:underline">Back to decks</Link>
      </div>
    )
  }

  const totalCards = deck.cards.length
  const masteredCount = stats?.known || 0
  const remainingUnseen = unseen.length
  const batchDone = workingSet.length === 0 && initialized && remainingUnseen > 0
  const allDone = workingSet.length === 0 && initialized && remainingUnseen === 0

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <Link to="/flashcards" className="text-sm text-indigo-400 hover:underline">
            &larr; All Decks
          </Link>
          <h1 className="text-2xl font-bold">{deck.title}</h1>
        </div>
        <div className="text-sm text-gray-500">
          {masteredCount}/{totalCards} mastered
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
            style={{ width: `${(masteredCount / totalCards) * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-gray-500">
          <span>Learning {workingSet.length} cards</span>
          <span>{remainingUnseen} unseen</span>
        </div>
      </div>

      {batchDone ? (
        <div className="text-center py-16">
          <h2 className="text-xl font-semibold mb-2">Batch complete!</h2>
          <p className="text-gray-500 mb-6">
            {remainingUnseen} cards remaining in this deck.
          </p>
          <button
            onClick={loadNextBatch}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-500 transition-colors"
          >
            Next {Math.min(BATCH_SIZE, remainingUnseen)} Cards
          </button>
        </div>
      ) : allDone ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">&#10003;</div>
          <h2 className="text-xl font-semibold mb-2">Deck complete!</h2>
          <p className="text-gray-500 mb-6">
            You've mastered all {totalCards} cards.
          </p>
          <button
            onClick={() => {
              // Reset to review all cards again
              const all = deck.cards.map((_, i) => i).slice(0, BATCH_SIZE)
              setWorkingSet(all)
              setCurrentPos(0)
            }}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-500 transition-colors"
          >
            Review Again
          </button>
        </div>
      ) : card ? (
        <>
          {/* Card */}
          <div className="flex justify-center mb-6">
            <div
              className="w-full max-w-lg cursor-pointer select-none"
              style={{ perspective: '1000px' }}
              onClick={flip}
            >
              <div
                className="relative transition-transform duration-500"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: flipped ? 'rotateY(180deg)' : 'rotateY(0)',
                }}
              >
                {/* Front */}
                <div
                  className="bg-gray-800 border border-gray-700 rounded-xl p-8 min-h-[200px] flex items-center justify-center text-center"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <span className="text-xl font-medium">{card.front}</span>
                </div>
                {/* Back */}
                <div
                  className="absolute inset-0 bg-gray-800 border border-indigo-500/30 rounded-xl p-8 min-h-[200px] flex items-center justify-center text-center"
                  style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                  }}
                >
                  <span className="text-lg text-indigo-200">{card.back}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-3 mb-4">
            <button
              onClick={markLearning}
              className="px-4 py-2 rounded-lg bg-orange-500/15 text-orange-400 font-medium text-sm hover:bg-orange-500/25 border border-orange-500/20 transition-colors"
            >
              Still Learning (1)
            </button>
            <button
              onClick={markKnown}
              className="px-4 py-2 rounded-lg bg-emerald-500/15 text-emerald-400 font-medium text-sm hover:bg-emerald-500/25 border border-emerald-500/20 transition-colors"
            >
              Know It (2)
            </button>
          </div>

          {/* Navigation */}
          <div className="flex justify-center items-center gap-4 text-sm text-gray-500">
            <button
              onClick={prev}
              disabled={workingSet.length <= 1}
              className="px-3 py-1 rounded hover:bg-gray-800 disabled:opacity-30 transition-colors"
            >
              &larr; Prev
            </button>
            <span>
              {currentPos + 1} / {workingSet.length}
            </span>
            <button
              onClick={next}
              disabled={workingSet.length <= 1}
              className="px-3 py-1 rounded hover:bg-gray-800 disabled:opacity-30 transition-colors"
            >
              Next &rarr;
            </button>
          </div>

          {/* Keyboard hints */}
          <div className="mt-6 text-center text-xs text-gray-600">
            <span>Space: flip</span>
            <span className="mx-2">|</span>
            <span>Arrow keys: navigate</span>
            <span className="mx-2">|</span>
            <span>1: still learning</span>
            <span className="mx-2">|</span>
            <span>2: know it</span>
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-gray-500">No cards in this deck.</div>
      )}
    </div>
  )
}
