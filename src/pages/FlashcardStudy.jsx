import { useParams, Link } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { getDeck } from '../data/loader'
import { useProgress } from '../hooks/useProgress'
import { useSpacedRepetition } from '../hooks/useSpacedRepetition'

export default function FlashcardStudy() {
  const { category } = useParams()
  const deck = getDeck(category)
  const { markCard, getCardStatus, getDeckStats } = useProgress()
  const sortedCards = useSpacedRepetition(deck?.cards, category, getCardStatus)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)

  const card = sortedCards[currentIndex]
  const stats = deck ? getDeckStats(deck.id) : null

  const flip = useCallback(() => setFlipped(f => !f), [])

  const next = useCallback(() => {
    if (currentIndex < sortedCards.length - 1) {
      setCurrentIndex(i => i + 1)
      setFlipped(false)
    }
  }, [currentIndex, sortedCards.length])

  const prev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1)
      setFlipped(false)
    }
  }, [currentIndex])

  const markKnown = useCallback(() => {
    if (card) {
      markCard(category, card.originalIndex, true)
      next()
    }
  }, [card, category, markCard, next])

  const markLearning = useCallback(() => {
    if (card) {
      markCard(category, card.originalIndex, false)
      next()
    }
  }, [card, category, markCard, next])

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
        <Link to="/flashcards" className="text-indigo-600 hover:underline">Back to decks</Link>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to="/flashcards" className="text-sm text-indigo-600 hover:underline">
            &larr; All Decks
          </Link>
          <h1 className="text-2xl font-bold">{deck.title}</h1>
        </div>
        <div className="text-sm text-gray-500">
          {stats.known}/{deck.cards.length} mastered
        </div>
      </div>

      {card ? (
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
                  className="bg-white rounded-xl shadow-lg p-8 min-h-[200px] flex items-center justify-center text-center"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <span className="text-xl font-medium">{card.front}</span>
                </div>
                {/* Back */}
                <div
                  className="absolute inset-0 bg-indigo-50 rounded-xl shadow-lg p-8 min-h-[200px] flex items-center justify-center text-center"
                  style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                  }}
                >
                  <span className="text-lg">{card.back}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-3 mb-4">
            <button
              onClick={markLearning}
              className="px-4 py-2 rounded-lg bg-orange-100 text-orange-700 font-medium text-sm hover:bg-orange-200 transition-colors"
            >
              Still Learning (1)
            </button>
            <button
              onClick={markKnown}
              className="px-4 py-2 rounded-lg bg-green-100 text-green-700 font-medium text-sm hover:bg-green-200 transition-colors"
            >
              Know It (2)
            </button>
          </div>

          {/* Navigation */}
          <div className="flex justify-center items-center gap-4 text-sm text-gray-500">
            <button
              onClick={prev}
              disabled={currentIndex === 0}
              className="px-3 py-1 rounded hover:bg-gray-200 disabled:opacity-30 transition-colors"
            >
              &larr; Prev
            </button>
            <span>
              {currentIndex + 1} / {sortedCards.length}
            </span>
            <button
              onClick={next}
              disabled={currentIndex === sortedCards.length - 1}
              className="px-3 py-1 rounded hover:bg-gray-200 disabled:opacity-30 transition-colors"
            >
              Next &rarr;
            </button>
          </div>

          {/* Keyboard hints */}
          <div className="mt-6 text-center text-xs text-gray-400">
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
