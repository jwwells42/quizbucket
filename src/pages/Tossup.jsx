import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { tossups } from '../data/loader'
import { useProgress } from '../hooks/useProgress'
import { useLevel } from '../context/LevelContext'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function Tossup() {
  const { recordTossup, getTossupStats } = useProgress()
  const { filterByLevel } = useLevel()
  const filteredTossups = filterByLevel(tossups)
  const stats = getTossupStats()

  const [shuffled, setShuffled] = useState(() => shuffle(filteredTossups))
  const [questionIndex, setQuestionIndex] = useState(0)
  const [revealedWords, setRevealedWords] = useState(0)
  const [answer, setAnswer] = useState('')
  const [result, setResult] = useState(null)
  const [buzzed, setBuzzed] = useState(false)
  const [paused, setPaused] = useState(true)

  const inputRef = useRef(null)
  const timerRef = useRef(null)

  // Reshuffle when the filtered set changes (level switch)
  const filteredKey = useMemo(() => filteredTossups.map(t => t.question).join('|'), [filteredTossups])
  useEffect(() => {
    setShuffled(shuffle(filteredTossups))
    setQuestionIndex(0)
    setRevealedWords(0)
    setAnswer('')
    setResult(null)
    setBuzzed(false)
    setPaused(true)
  }, [filteredKey])

  const question = shuffled[questionIndex] || shuffled[0]
  const words = question.question.split(' ')

  const startReveal = useCallback(() => {
    setPaused(false)
    setRevealedWords(1)
  }, [])

  useEffect(() => {
    if (paused || buzzed || result) return

    timerRef.current = setInterval(() => {
      setRevealedWords(prev => {
        if (prev >= words.length) {
          clearInterval(timerRef.current)
          return prev
        }
        return prev + 1
      })
    }, 300)

    return () => clearInterval(timerRef.current)
  }, [paused, buzzed, result, words.length])

  const buzz = useCallback(() => {
    if (buzzed || result) return
    clearInterval(timerRef.current)
    setBuzzed(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [buzzed, result])

  const submitAnswer = useCallback(() => {
    if (!answer.trim()) return
    const normalize = s => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
    const correct = normalize(question.answer)
    const given = normalize(answer)

    const isCorrect = correct === given ||
      correct.includes(given) ||
      given.includes(correct)

    setResult(isCorrect ? 'correct' : 'incorrect')
    recordTossup(isCorrect)
  }, [answer, question.answer, recordTossup])

  const nextQuestion = useCallback(() => {
    if (questionIndex + 1 >= shuffled.length) {
      // All questions seen — reshuffle and start over
      setShuffled(shuffle(filteredTossups))
      setQuestionIndex(0)
    } else {
      setQuestionIndex(i => i + 1)
    }
    setRevealedWords(0)
    setAnswer('')
    setResult(null)
    setBuzzed(false)
    setPaused(true)
  }, [questionIndex, shuffled.length, filteredTossups])

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Enter' && !buzzed && !paused && !result) {
        e.preventDefault()
        buzz()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [buzz, buzzed, paused, result])

  const revealedText = words.slice(0, revealedWords).join(' ')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Tossup Practice</h1>
        <div className="text-sm text-gray-500">
          {stats.total > 0
            ? `${stats.correct}/${stats.total} (${Math.round((stats.correct / stats.total) * 100)}%)`
            : 'No attempts yet'}
        </div>
      </div>

      {/* Category badge */}
      <div className="mb-4">
        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-indigo-500/20 text-indigo-300">
          {question.category}
        </span>
        <span className="text-xs text-gray-600 ml-2">
          Question {questionIndex + 1} of {shuffled.length}
        </span>
      </div>

      {/* Question text */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6 min-h-[120px]">
        {paused ? (
          <div className="text-center">
            <button
              onClick={startReveal}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-500 transition-colors"
            >
              Start Question
            </button>
          </div>
        ) : (
          <p className="text-lg leading-relaxed">
            {revealedText}
            {revealedWords < words.length && !buzzed && !result && (
              <span className="inline-block w-2 h-5 bg-indigo-500 ml-1 animate-pulse" />
            )}
          </p>
        )}
      </div>

      {/* Buzz / Answer area */}
      {!paused && !result && (
        <div className="mb-6">
          {!buzzed ? (
            <div className="text-center">
              <button
                onClick={buzz}
                className="px-8 py-3 bg-red-600 text-white rounded-lg font-bold text-lg hover:bg-red-500 transition-colors"
              >
                BUZZ (Enter)
              </button>
            </div>
          ) : (
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
                className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoComplete="off"
              />
              <button
                type="submit"
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-500 transition-colors"
              >
                Submit
              </button>
            </form>
          )}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="mb-6">
          <div
            className={`rounded-lg p-4 mb-4 border ${
              result === 'correct'
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-red-500/10 border-red-500/30'
            }`}
          >
            <p className={`font-semibold ${result === 'correct' ? 'text-emerald-400' : 'text-red-400'}`}>
              {result === 'correct' ? 'Correct!' : 'Incorrect'}
            </p>
            <p className="text-sm mt-1">
              <span className="text-gray-500">Answer: </span>
              <span className="font-medium">{question.answer}</span>
            </p>
            {result === 'incorrect' && (
              <p className="text-sm mt-1">
                <span className="text-gray-500">You said: </span>
                <span className="text-gray-400">{answer}</span>
              </p>
            )}
          </div>

          {/* Full question */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-4 text-sm text-gray-400">
            <p className="font-medium text-gray-300 mb-1">Full question:</p>
            <p>{question.question}</p>
          </div>

          <div className="text-center">
            <button
              onClick={nextQuestion}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-500 transition-colors"
            >
              Next Question
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
