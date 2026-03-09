import { useState, useEffect, useRef, useCallback } from 'react'
import { lightning } from '../data/loader'
import { useProgress } from '../hooks/useProgress'

export default function Lightning() {
  const { recordLightning, getLightningStats } = useProgress()
  const lightningStats = getLightningStats()

  const [selectedSets, setSelectedSets] = useState(lightning.map(s => s.id))
  const [phase, setPhase] = useState('setup') // 'setup' | 'playing' | 'done'
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [results, setResults] = useState([])
  const [timeLeft, setTimeLeft] = useState(60)
  const [feedback, setFeedback] = useState(null) // null | 'correct' | 'incorrect'

  const inputRef = useRef(null)
  const timerRef = useRef(null)

  const toggleSet = (id) => {
    setSelectedSets(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  const startRound = useCallback(() => {
    const pool = lightning
      .filter(s => selectedSets.includes(s.id))
      .flatMap(s => s.questions.map(q => ({ ...q, setId: s.id })))

    // Shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]]
    }

    setQuestions(pool)
    setCurrentIndex(0)
    setResults([])
    setTimeLeft(60)
    setPhase('playing')
    setAnswer('')
    setFeedback(null)
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [selectedSets])

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

  // Record stats when round ends
  useEffect(() => {
    if (phase !== 'done' || results.length === 0) return
    const correct = results.filter(r => r.correct).length
    // Record for each set used
    const setsUsed = [...new Set(results.map(r => r.setId))]
    setsUsed.forEach(setId => {
      const setResults = results.filter(r => r.setId === setId)
      const setCorrect = setResults.filter(r => r.correct).length
      recordLightning(setId, setCorrect, setResults.length)
    })
  }, [phase, results, recordLightning])

  const submitAnswer = useCallback(() => {
    const q = questions[currentIndex]
    if (!q) return

    const normalize = s => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
    const correct = normalize(q.answer)
    const given = normalize(answer)
    const isCorrect = correct === given || correct.includes(given) || given.includes(correct)

    const newResult = { ...q, given: answer, correct: isCorrect }
    setResults(prev => [...prev, newResult])
    setFeedback(isCorrect ? 'correct' : 'incorrect')

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
  }, [answer, currentIndex, questions])

  const skipQuestion = useCallback(() => {
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
  }, [currentIndex, questions])

  if (phase === 'setup') {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Lightning Round</h1>
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="font-semibold mb-3">Select question sets:</h2>
          <div className="space-y-2">
            {lightning.map(set => {
              const stat = lightningStats[set.id]
              return (
                <label key={set.id} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSets.includes(set.id)}
                    onChange={() => toggleSet(set.id)}
                    className="rounded text-indigo-600 w-4 h-4"
                  />
                  <div className="flex-1">
                    <span className="font-medium">{set.title}</span>
                    <span className="text-sm text-gray-400 ml-2">({set.questions.length} questions)</span>
                    {stat && (
                      <span className="text-xs text-gray-400 ml-2">
                        Best: {stat.bestScore}/{stat.lastTotal}
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
            className="px-8 py-3 bg-amber-500 text-white rounded-lg font-bold text-lg hover:bg-amber-600 disabled:opacity-40 transition-colors"
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
        <h1 className="text-2xl font-bold mb-6">Round Complete!</h1>
        <div className="bg-white rounded-lg shadow p-6 mb-6 text-center">
          <div className="text-5xl font-bold text-amber-600 mb-2">
            {correct}/{results.length}
          </div>
          <p className="text-gray-500">questions answered correctly</p>
        </div>

        {/* Results breakdown */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="font-semibold mb-3">Results</h2>
          <div className="space-y-2">
            {results.map((r, i) => (
              <div
                key={i}
                className={`flex justify-between items-start p-2 rounded text-sm ${
                  r.correct ? 'bg-green-50' : 'bg-red-50'
                }`}
              >
                <div>
                  <span className="font-medium">{r.question}</span>
                  {!r.correct && r.given && (
                    <span className="text-red-500 ml-2">You said: {r.given}</span>
                  )}
                </div>
                <span className={`font-medium shrink-0 ml-4 ${r.correct ? 'text-green-600' : 'text-red-600'}`}>
                  {r.answer}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <button
            onClick={startRound}
            className="px-6 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors"
          >
            Play Again
          </button>
          <button
            onClick={() => setPhase('setup')}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
          >
            Change Sets
          </button>
        </div>
      </div>
    )
  }

  // Playing phase
  const q = questions[currentIndex]
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Lightning Round</h1>
        <div
          className={`text-2xl font-mono font-bold ${timeLeft <= 10 ? 'text-red-500' : 'text-gray-700'}`}
        >
          {timeLeft}s
        </div>
      </div>

      {/* Score bar */}
      <div className="flex gap-2 mb-4 text-sm text-gray-500">
        <span className="text-green-600 font-medium">
          {results.filter(r => r.correct).length} correct
        </span>
        <span>·</span>
        <span>
          Question {currentIndex + 1}/{questions.length}
        </span>
      </div>

      {/* Question */}
      <div
        className={`bg-white rounded-lg shadow p-6 mb-4 transition-colors ${
          feedback === 'correct'
            ? 'ring-2 ring-green-400'
            : feedback === 'incorrect'
              ? 'ring-2 ring-red-400'
              : ''
        }`}
      >
        <p className="text-lg font-medium">{q.question}</p>
      </div>

      {/* Answer input */}
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
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-lg"
          autoComplete="off"
          disabled={feedback !== null}
        />
        <button
          type="button"
          onClick={skipQuestion}
          disabled={feedback !== null}
          className="px-4 py-3 bg-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-300 disabled:opacity-40 transition-colors"
        >
          Skip
        </button>
      </form>
    </div>
  )
}
