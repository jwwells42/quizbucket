import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { lightning, flashcardDecks } from '../data/loader'
import { useProgress } from '../hooks/useProgress'
import { useLevel } from '../context/LevelContext'
import { checkAnswer, isCloseAnswer } from '../utils/answerCheck'

// Map lightning IDs to flashcard deck IDs where they differ
const DECK_ID_MAP = {
  'element-symbols': 'elements',
  'greek-roman-gods': 'greek-roman-mythology',
}

function getMatchingDeck(lightningId) {
  const deckId = DECK_ID_MAP[lightningId] || lightningId
  return flashcardDecks.find(d => d.id === deckId)
}

const ROUND_SIZE = 10

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function Lightning() {
  const { recordLightning, getLightningStats } = useProgress()
  const { filterByLevel } = useLevel()
  const topics = filterByLevel(lightning)
  const lightningStats = getLightningStats()

  const [selectedSets, setSelectedSets] = useState(topics.map(s => s.id))
  const [phase, setPhase] = useState('setup')
  const [activeSet, setActiveSet] = useState(null) // the chosen topic for this round
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [results, setResults] = useState([])
  const [timeLeft, setTimeLeft] = useState(60)
  const [feedback, setFeedback] = useState(null)

  const inputRef = useRef(null)
  const timerRef = useRef(null)

  const toggleSet = (id) => {
    setSelectedSets(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  const startRound = useCallback(() => {
    // Pick one random topic from selected sets
    const eligible = topics.filter(s => selectedSets.includes(s.id))
    const chosen = eligible[Math.floor(Math.random() * eligible.length)]

    // Pull 10 random questions from its bank
    const pool = shuffle(chosen.questions).slice(0, ROUND_SIZE)

    setActiveSet(chosen)
    setQuestions(pool)
    setCurrentIndex(0)
    setResults([])
    setTimeLeft(60)
    setPhase('playing')
    setAnswer('')
    setFeedback(null)
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [selectedSets, topics])

  useEffect(() => {
    if (phase !== 'playing') return

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          setPhase('done')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timerRef.current)
  }, [phase])

  useEffect(() => {
    if (phase !== 'done' || results.length === 0 || !activeSet) return
    const correct = results.filter(r => r.correct).length
    recordLightning(activeSet.id, correct, results.length)
  }, [phase, results, activeSet, recordLightning])

  const submitAnswer = useCallback(() => {
    if (feedback) return
    const q = questions[currentIndex]
    if (!q) return

    const isCorrect = checkAnswer(q.answer, answer)
    const isClose = !isCorrect && isCloseAnswer(q.answer, answer)

    setResults(prev => [...prev, { ...q, given: answer, correct: isCorrect, close: isClose }])
    setFeedback(isCorrect ? 'correct' : isClose ? 'close' : 'incorrect')

    setTimeout(() => {
      setFeedback(null)
      setAnswer('')
      if (currentIndex + 1 >= questions.length) {
        clearInterval(timerRef.current)
        setPhase('done')
      } else {
        setCurrentIndex(i => i + 1)
      }
      inputRef.current?.focus()
    }, 400)
  }, [answer, currentIndex, questions, feedback])

  const skipQuestion = useCallback(() => {
    if (feedback) return
    const q = questions[currentIndex]
    if (!q) return
    setResults(prev => [...prev, { ...q, given: '', correct: false }])
    setFeedback('incorrect')

    setTimeout(() => {
      setFeedback(null)
      setAnswer('')
      if (currentIndex + 1 >= questions.length) {
        clearInterval(timerRef.current)
        setPhase('done')
      } else {
        setCurrentIndex(i => i + 1)
      }
      inputRef.current?.focus()
    }, 400)
  }, [currentIndex, questions, feedback])

  if (phase === 'setup') {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Lightning Round</h1>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
          <h2 className="font-semibold mb-1">Select topics:</h2>
          <p className="text-sm text-gray-500 mb-3">
            One topic will be randomly chosen. 10 questions pulled from its bank.
          </p>
          <div className="space-y-2">
            {topics.map(set => {
              const stat = lightningStats[set.id]
              return (
                <label key={set.id} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSets.includes(set.id)}
                    onChange={() => toggleSet(set.id)}
                    className="rounded bg-gray-700 border-gray-600 text-indigo-500 w-4 h-4"
                  />
                  <div className="flex-1">
                    <span className="font-medium">{set.title}</span>
                    <span className="text-sm text-gray-500 ml-2">({set.questions.length} in bank)</span>
                    {stat && (
                      <span className="text-xs text-gray-600 ml-2">
                        Best: {stat.bestScore}/{ROUND_SIZE}
                      </span>
                    )}
                  </div>
                </label>
              )
            })}
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={startRound}
            disabled={selectedSets.length === 0}
            className="px-8 py-3 bg-amber-600 text-white rounded-lg font-bold text-lg hover:bg-amber-500 disabled:opacity-40 transition-colors"
          >
            Start Round (60s)
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'done') {
    const correct = results.filter(r => r.correct).length
    return (
      <div>
        <h1 className="text-2xl font-bold mb-1">Round Complete!</h1>
        <p className="text-gray-500 text-sm mb-6">{activeSet.title}</p>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6 text-center">
          <div className="text-5xl font-bold text-amber-400 mb-2">
            {correct}/{results.length}
          </div>
          <p className="text-gray-500">questions answered correctly</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
          <h2 className="font-semibold mb-3">Results</h2>
          <div className="space-y-2">
            {results.map((r, i) => (
              <div
                key={i}
                className={`flex justify-between items-start p-2 rounded text-sm ${
                  r.correct ? 'bg-emerald-500/10' : r.close ? 'bg-amber-500/10' : 'bg-red-500/10'
                }`}
              >
                <div>
                  <span className="font-medium">{r.question}</span>
                  {!r.correct && r.given && (
                    <span className={`ml-2 ${r.close ? 'text-amber-400' : 'text-red-400'}`}>
                      {r.close ? 'Close! ' : ''}You said: {r.given}
                    </span>
                  )}
                </div>
                <span className={`font-medium shrink-0 ml-4 ${r.correct ? 'text-emerald-400' : 'text-red-400'}`}>
                  {r.answer}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-4">
          <button
            onClick={startRound}
            className="px-6 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-500 transition-colors"
          >
            Play Again
          </button>
          {(() => {
            const deck = getMatchingDeck(activeSet.id)
            if (!deck) return null
            return (
              <Link
                to={`/flashcards/${deck.id}`}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-500 transition-colors"
              >
                Study Flashcards
              </Link>
            )
          })()}
          <button
            onClick={() => setPhase('setup')}
            className="px-6 py-2 bg-gray-700 text-gray-300 rounded-lg font-medium hover:bg-gray-600 transition-colors"
          >
            Change Topics
          </button>
        </div>
      </div>
    )
  }

  const q = questions[currentIndex]
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Lightning Round</h1>
          <p className="text-sm text-gray-500">{activeSet.title}</p>
        </div>
        <div
          className={`text-2xl font-mono font-bold ${timeLeft <= 10 ? 'text-red-400' : 'text-gray-300'}`}
        >
          {timeLeft}s
        </div>
      </div>

      <div className="flex gap-2 mb-4 text-sm text-gray-500">
        <span className="text-emerald-400 font-medium">
          {results.filter(r => r.correct).length} correct
        </span>
        <span>·</span>
        <span>
          Question {currentIndex + 1}/{questions.length}
        </span>
      </div>

      <div
        className={`bg-gray-900 border rounded-lg p-6 mb-4 transition-colors ${
          feedback === 'correct'
            ? 'border-emerald-500'
            : feedback === 'close'
              ? 'border-amber-500'
              : feedback === 'incorrect'
                ? 'border-red-500'
                : 'border-gray-800'
        }`}
      >
        <p className="text-lg font-medium">{q.question}</p>
      </div>

      <form
        onSubmit={e => {
          e.preventDefault()
          submitAnswer()
        }}
        className="flex gap-2"
      >
        <input
          ref={inputRef}
          type="text"
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          placeholder="Type answer and press Enter..."
          className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 text-lg"
          autoComplete="off"
        />
        <button
          type="button"
          onClick={skipQuestion}
          className="px-4 py-3 bg-gray-700 text-gray-400 rounded-lg font-medium hover:bg-gray-600 transition-colors"
        >
          Skip
        </button>
      </form>
    </div>
  )
}
