import { useState, useEffect, useRef, useCallback } from 'react'
import { generateRound } from '../data/mathProblems'
import { useLevel } from '../context/LevelContext'
import { useProgress } from '../hooks/useProgress'
import { ALL_LEVELS, LEVEL_LABELS } from '../context/LevelContext'

const ROUND_SIZE = 10
const TIME_LIMIT = 20

function normalizeAnswer(str) {
  return str.toLowerCase().replace(/\s+/g, ' ').trim()
}

function answersMatch(given, expected) {
  const g = normalizeAnswer(String(given))
  const e = normalizeAnswer(String(expected))
  if (g === e) return true
  // Try numeric comparison for pure numbers
  const gn = parseFloat(g), en = parseFloat(e)
  if (!isNaN(gn) && !isNaN(en) && Math.abs(gn - en) < 0.01) return true
  return false
}

export default function Computation() {
  const { level } = useLevel()
  const { recordComputation, getComputationStats } = useProgress()
  const stats = getComputationStats()

  // If no level is selected, show a level picker for this mode
  const [selectedLevel, setSelectedLevel] = useState(level || '7-9')
  const [phase, setPhase] = useState('setup') // setup | playing | done
  const [problems, setProblems] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [results, setResults] = useState([])
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT)
  const [feedback, setFeedback] = useState(null)

  const inputRef = useRef(null)
  const timerRef = useRef(null)

  // Sync with nav level picker when it changes
  useEffect(() => {
    if (level) setSelectedLevel(level)
  }, [level])

  const startRound = useCallback(() => {
    const round = generateRound(selectedLevel, ROUND_SIZE)
    setProblems(round)
    setCurrentIndex(0)
    setResults([])
    setTimeLeft(TIME_LIMIT)
    setPhase('playing')
    setAnswer('')
    setFeedback(null)
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [selectedLevel])

  // Countdown timer per question
  useEffect(() => {
    if (phase !== 'playing' || feedback) return

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          // Time's up — mark as incorrect
          const q = problems[currentIndex]
          if (q) {
            setResults(r => [...r, { ...q, given: '', correct: false }])
            setFeedback('timeout')
            setTimeout(() => advanceQuestion(), 1200)
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timerRef.current)
  }, [phase, currentIndex, feedback, problems])

  const advanceQuestion = useCallback(() => {
    setFeedback(null)
    setAnswer('')
    if (currentIndex + 1 >= problems.length) {
      setPhase('done')
    } else {
      setCurrentIndex(i => i + 1)
      setTimeLeft(TIME_LIMIT)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [currentIndex, problems.length])

  const submitAnswer = useCallback(() => {
    if (feedback || !answer.trim()) return
    clearInterval(timerRef.current)

    const q = problems[currentIndex]
    const isCorrect = answersMatch(answer, q.answer)

    setResults(prev => [...prev, { ...q, given: answer, correct: isCorrect }])
    setFeedback(isCorrect ? 'correct' : 'incorrect')

    setTimeout(() => advanceQuestion(), 800)
  }, [answer, currentIndex, problems, feedback, advanceQuestion])

  const skipQuestion = useCallback(() => {
    if (feedback) return
    clearInterval(timerRef.current)

    const q = problems[currentIndex]
    setResults(prev => [...prev, { ...q, given: '', correct: false }])
    setFeedback('skipped')

    setTimeout(() => advanceQuestion(), 800)
  }, [currentIndex, problems, feedback, advanceQuestion])

  // Record stats when round is done
  useEffect(() => {
    if (phase !== 'done' || results.length === 0) return
    const correct = results.filter(r => r.correct).length
    recordComputation(correct, results.length)
  }, [phase, results, recordComputation])

  // ─── Setup phase ───
  if (phase === 'setup') {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Math Computation</h1>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
          <h2 className="font-semibold mb-1">How it works:</h2>
          <p className="text-sm text-gray-400 mb-4">
            You'll get {ROUND_SIZE} math problems. Each has a {TIME_LIMIT}-second timer — work it out on scratch paper and type your answer. Just like AGQBA computation questions.
          </p>
          <h2 className="font-semibold mb-2">Select difficulty:</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {ALL_LEVELS.map(l => (
              <button
                key={l}
                onClick={() => setSelectedLevel(l)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedLevel === l
                    ? 'bg-cyan-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                }`}
              >
                {LEVEL_LABELS[l]}
              </button>
            ))}
          </div>
          {stats.total > 0 && (
            <p className="text-sm text-gray-500">
              Your stats: {stats.correct}/{stats.total} correct ({Math.round((stats.correct / stats.total) * 100)}%) across {stats.rounds} round{stats.rounds !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div className="text-center">
          <button
            onClick={startRound}
            className="px-8 py-3 bg-cyan-600 text-white rounded-lg font-bold text-lg hover:bg-cyan-500 transition-colors"
          >
            Start Round ({ROUND_SIZE} problems)
          </button>
        </div>
      </div>
    )
  }

  // ─── Done phase ───
  if (phase === 'done') {
    const correct = results.filter(r => r.correct).length
    return (
      <div>
        <h1 className="text-2xl font-bold mb-1">Round Complete!</h1>
        <p className="text-gray-500 text-sm mb-6">{LEVEL_LABELS[selectedLevel]} — Math Computation</p>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6 text-center">
          <div className="text-5xl font-bold text-cyan-400 mb-2">
            {correct}/{results.length}
          </div>
          <p className="text-gray-500">problems answered correctly</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
          <h2 className="font-semibold mb-3">Results</h2>
          <div className="space-y-2">
            {results.map((r, i) => (
              <div
                key={i}
                className={`flex justify-between items-start p-3 rounded text-sm ${
                  r.correct ? 'bg-emerald-500/10' : 'bg-red-500/10'
                }`}
              >
                <div>
                  <span className="font-medium font-mono">{r.question}</span>
                  {!r.correct && r.given && (
                    <span className="text-red-400 ml-2">You said: {r.given}</span>
                  )}
                  {!r.correct && !r.given && (
                    <span className="text-red-400 ml-2">(no answer)</span>
                  )}
                </div>
                <span className={`font-medium font-mono shrink-0 ml-4 ${r.correct ? 'text-emerald-400' : 'text-red-400'}`}>
                  {String(r.answer)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <button
            onClick={startRound}
            className="px-6 py-2 bg-cyan-600 text-white rounded-lg font-medium hover:bg-cyan-500 transition-colors"
          >
            Play Again
          </button>
          <button
            onClick={() => setPhase('setup')}
            className="px-6 py-2 bg-gray-700 text-gray-300 rounded-lg font-medium hover:bg-gray-600 transition-colors"
          >
            Change Difficulty
          </button>
        </div>
      </div>
    )
  }

  // ─── Playing phase ───
  const q = problems[currentIndex]
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Math Computation</h1>
          <p className="text-sm text-gray-500">{LEVEL_LABELS[selectedLevel]}</p>
        </div>
        <div
          className={`text-2xl font-mono font-bold ${timeLeft <= 5 ? 'text-red-400' : 'text-gray-300'}`}
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
          Problem {currentIndex + 1}/{problems.length}
        </span>
      </div>

      <div
        className={`bg-gray-900 border rounded-lg p-6 mb-4 transition-colors ${
          feedback === 'correct'
            ? 'border-emerald-500'
            : feedback === 'incorrect' || feedback === 'timeout' || feedback === 'skipped'
              ? 'border-red-500'
              : 'border-gray-800'
        }`}
      >
        <p className="text-xl font-medium font-mono">{q.question}</p>
        {(feedback === 'incorrect' || feedback === 'timeout' || feedback === 'skipped') && (
          <p className="text-sm text-emerald-400 mt-2">Answer: {String(q.answer)}</p>
        )}
        {feedback === 'timeout' && (
          <p className="text-sm text-red-400 mt-1">Time's up!</p>
        )}
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
          placeholder="Type your answer..."
          disabled={!!feedback}
          className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-lg font-mono disabled:opacity-50"
          autoComplete="off"
        />
        <button
          type="button"
          onClick={skipQuestion}
          disabled={!!feedback}
          className="px-4 py-3 bg-gray-700 text-gray-400 rounded-lg font-medium hover:bg-gray-600 transition-colors disabled:opacity-50"
        >
          Skip
        </button>
      </form>
    </div>
  )
}
