import { Link } from 'react-router-dom'
import { useProgress } from '../hooks/useProgress'
import { flashcardDecks } from '../data/loader'

const modes = [
  {
    to: '/flashcards',
    title: 'Flashcards',
    description: 'Study facts with flip cards and spaced repetition',
    accent: 'bg-blue-500',
  },
  {
    to: '/tossup',
    title: 'Tossup Practice',
    description: 'Buzz in as clues reveal word by word',
    accent: 'bg-emerald-500',
  },
  {
    to: '/lightning',
    title: 'Lightning Round',
    description: '60-second rapid-fire questions',
    accent: 'bg-amber-500',
  },
  {
    to: '/memorize',
    title: 'Text Memorizer',
    description: 'Progressively memorize famous texts and speeches',
    accent: 'bg-purple-500',
  },
]

export default function Home() {
  const { getDeckStats, getTossupStats, getLightningStats } = useProgress()
  const tossupStats = getTossupStats()
  const lightningStats = getLightningStats()

  const totalCardsStudied = flashcardDecks.reduce((sum, deck) => {
    return sum + getDeckStats(deck.id).total
  }, 0)

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">QuizBucket</h1>
        <p className="text-gray-500">AGQBA Quiz Bowl Study Tool</p>
      </div>

      {/* Study mode cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {modes.map(mode => (
          <Link
            key={mode.to}
            to={mode.to}
            className="block rounded-lg overflow-hidden bg-gray-900 border border-gray-800 hover:border-gray-700 transition-colors"
          >
            <div className={`${mode.accent} h-1.5`} />
            <div className="p-5">
              <h2 className="text-lg font-semibold mb-1">{mode.title}</h2>
              <p className="text-sm text-gray-500">{mode.description}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Progress summary */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Your Progress</h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-400">{totalCardsStudied}</div>
            <div className="text-xs text-gray-500">Cards Studied</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-400">
              {tossupStats.total > 0
                ? `${Math.round((tossupStats.correct / tossupStats.total) * 100)}%`
                : '—'}
            </div>
            <div className="text-xs text-gray-500">Tossup Accuracy</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-400">
              {Object.keys(lightningStats).length > 0
                ? Object.values(lightningStats).reduce((sum, s) => sum + s.timesPlayed, 0)
                : '—'}
            </div>
            <div className="text-xs text-gray-500">Lightning Rounds</div>
          </div>
        </div>
      </div>

      {/* Deck progress breakdown */}
      <div className="mt-6 bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Flashcard Decks</h2>
        <div className="space-y-3">
          {flashcardDecks.map(deck => {
            const stats = getDeckStats(deck.id)
            const total = deck.cards.length
            const pct = total > 0 ? Math.round((stats.known / total) * 100) : 0
            return (
              <Link
                key={deck.id}
                to={`/flashcards/${deck.id}`}
                className="block hover:bg-gray-800 rounded p-2 -mx-2 transition-colors"
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium">{deck.title}</span>
                  <span className="text-xs text-gray-500">
                    {stats.known}/{total} mastered
                  </span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
