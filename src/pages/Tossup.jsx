import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { tossups } from '../data/loader'
import { useProgress } from '../hooks/useProgress'
import { useLevel } from '../context/LevelContext'

const ROUND_SIZE = 20

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
  const [phase, setPhase] = useState('setup') // setup | playing | done
  const [questionIndex, setQuestionIndex] = useState(0)
  const [revealedWords, setRevealedWords] = useState(0)
  const [answer, setAnswer] = useState('')
  const [result, setResult] = useState(null)
  const [buzzed, setBuzzed] = useState(false)
  const [paused, setPaused] = useState(true)
  const [roundResults, setRoundResults] = useState([])

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
    setPhase('setup')
    setRoundResults([])
  }, [filteredKey])

  const roundQuestions = shuffled.slice(0, ROUND_SIZE)
  const question = roundQuestions[questionIndex]
  const words = question ? question.question.split(' ') : []

  const startRound = useCallback(() => {
    setShuffled(shuffle(filteredTossups))
    setQuestionIndex(0)
    setRoundResults([])
    setRevealedWords(0)
    setAnswer('')
    setResult(null)
    setBuzzed(false)
    setPaused(true)
    setPhase('playing')
  }, [filteredTossups])

  const startReveal = useCallback(() => {
    setPaused(false)
    setRevealedWords(1)
  }, [])

  useEffect(() => {
    if (phase !== 'playing' || paused || buzzed || result) return

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
  }, [phase, paused, buzzed, result, words.length])

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
    setRoundResults(prev => [...prev, {
      question: question.question,
      answer: question.answer,
      category: question.category,
      given: answer,
      correct: isCorrect,
    }])
    recordTossup(isCorrect)
  }, [answer, question, recordTossup])

  const nextQuestion = useCallback(() => {
    if (questionIndex + 1 >= roundQuestions.length) {
      setPhase('done')
      return
    }
    setQuestionIndex(i => i + 1)
    setRevealedWords(0)
    setAnswer('')
    setResult(null)
    setBuzzed(false)
    setPaused(true)
  }, [questionIndex, roundQuestions.length])

  useEffect(() => {
    function handleKey(e) {
      if (phase !== 'playing') return
      if (e.key === 'Enter' && !buzzed && !paused && !result) {
        e.preventDefault()
        buzz()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [buzz, buzzed, paused, result, phase])

  const revealedText = words.slice(0, revealedWords).join(' ')

  // ─── Setup phase ───
  if (phase === 'setup') {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Tossup Practice</h1>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
          <h2 className="font-semibold mb-1">How it works:</h2>
          <p className="text-sm text-gray-400 mb-4">
            A round of {ROUND_SIZE} tossup questions — just like AGQBA Rounds 1 and 4. Each question reveals word by word. Buzz in when you know the answer.
          </p>
          {stats.total > 0 && (
            <p className="text-sm text-gray-500">
              Your stats: {stats.correct}/{stats.total} correct ({Math.round((stats.correct / stats.total) * 100)}%) across all rounds
            </p>
          )}
        </div>
        <div className="text-center">
          <button
            onClick={startRound}
            className="px-8 py-3 bg-emerald-600 text-white rounded-lg font-bold text-lg hover:bg-emerald-500 transition-colors"
          >
            Start Round ({ROUND_SIZE} questions)
          </button>
        </div>
      </div>
    )
  }

  // ─── Done phase ───
  if (phase === 'done') {
    const correct = roundResults.filter(r => r.correct).length
    return (
      <div>
        <h1 className="text-2xl font-bold mb-1">Round Complete!</h1>
        <p className="text-gray-500 text-sm mb-6">Tossup Practice</p>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6 text-center">
          <div className="text-5xl font-bold text-emerald-400 mb-2">
            {correct}/{roundResults.length}
          </div>
          <p className="text-gray-500">
            {correct * 10} points earned
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
          <h2 className="font-semibold mb-3">Results</h2>
          <div className="space-y-2">
            {roundResults.map((r, i) => (
              <div
                key={i}
                className={`p-3 rounded text-sm ${
                  r.correct ? 'bg-emerald-500/10' : 'bg-red-500/10'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <span className="text-xs text-gray-500 mr-2">{i + 1}.</span>
                    <span className="font-medium">{r.answer}</span>
                    <span className="text-xs text-gray-600 ml-2">{r.category}</span>
                  </div>
                  <span className={`font-medium shrink-0 ml-4 ${r.correct ? 'text-emerald-400' : 'text-red-400'}`}>
                    {r.correct ? '+10' : '0'}
                  </span>
                </div>
                {!r.correct && r.given && (
                  <p className="text-red-400 text-xs mt-1 ml-5">You said: {r.given}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <button
            onClick={startRound}
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-500 transition-colors"
          >
            New Round
          </button>
        </div>
      </div>
    )
  }

  // ─── Playing phase ───
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Tossup Practice</h1>
        <div className="text-sm text-gray-500">
          {roundResults.filter(r => r.correct).length * 10} pts
        </div>
      </div>

      <div className="mb-4 text-sm text-gray-500">
        <span className="text-emerald-400 font-medium">
          {roundResults.filter(r => r.correct).length} correct
        </span>
        <span className="mx-1">·</span>
        <span>Question {questionIndex + 1} of {roundQuestions.length}</span>
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
              {result === 'correct' ? 'Correct! +10 points' : 'Incorrect'}
            </p>
            <p className="text-sm mt-1">
              <span className="text-gray-500">Answer: </span>
              <span className="font-medium">{question.answer}</span>
              <span className="text-xs text-gray-600 ml-2">{question.category}</span>
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
              {questionIndex + 1 >= roundQuestions.length ? 'See Results' : 'Next Question'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
