import { Link } from 'react-router-dom'
import { flashcardDecks } from '../data/loader'
import { useProgress } from '../hooks/useProgress'

export default function FlashcardList() {
  const { getDeckStats } = useProgress()

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Flashcard Decks</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {flashcardDecks.map(deck => {
          const stats = getDeckStats(deck.id)
          const total = deck.cards.length
          return (
            <Link
              key={deck.id}
              to={`/flashcards/${deck.id}`}
              className="block bg-gray-900 border border-gray-800 rounded-lg hover:border-gray-700 transition-colors p-5"
            >
              <h2 className="text-lg font-semibold mb-1">{deck.title}</h2>
              <p className="text-sm text-gray-500 mb-3">{deck.description}</p>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{total} cards</span>
                <span>
                  {stats.known > 0 && `${stats.known} mastered`}
                  {stats.known > 0 && stats.learning > 0 && ' · '}
                  {stats.learning > 0 && `${stats.learning} learning`}
                  {stats.total === 0 && 'Not started'}
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
