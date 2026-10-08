import { useState, useEffect, useRef, useCallback } from 'react'
import { judgeAnswer } from '../../utils/jhAnswerCheck'
import { useCountdown } from './useCountdown'
import AnswerText from './AnswerText'

const ROUND_TIME = 60

// One packet lightning category: 10 questions in packet order, 60 seconds.
export default function LightningRound({ set, onFinish, footer }) {
  const [roundId, setRoundId] = useState(null)
  const [stage, setStage] = useState('ready') // ready | playing | done
  const [index, setIndex] = useState(0)
  const [given, setGiven] = useState('')
  const [results, setResults] = useState([])
  const [feedback, setFeedback] = useState(null)
  const [prompted, setPrompted] = useState(false)
  const inputRef = useRef(null)
  const questions = set.questions

  const end = useCallback(() => setStage('done'), [])
  const timeLeft = useCountdown(ROUND_TIME, stage === 'playing', roundId, end)

  useEffect(() => {
    if (stage === 'playing') inputRef.current?.focus()
  }, [stage, index])

  // Report after the round, and again if an "I was right" override changes the score
  const reportedRef = useRef(null)
  useEffect(() => {
    if (stage !== 'done' || !roundId) return
    const correct = results.filter(r => r.correct).length
    const key = `${roundId}:${correct}`
    if (reportedRef.current === key) return
    reportedRef.current = key
    onFinish?.(roundId, { correct, total: questions.length })
  }, [stage, results, roundId, questions.length, onFinish])

  const start = () => {
    setRoundId(Date.now())
    setIndex(0)
    setResults([])
    setGiven('')
    setPrompted(false)
    setFeedback(null)
    setStage('playing')
  }

  const advance = entry => {
    setResults(r => [...r, entry])
    setFeedback(entry.correct ? 'correct' : entry.verdict === 'close' ? 'close' : 'incorrect')
    setGiven('')
    setPrompted(false)
    setTimeout(() => {
      setFeedback(null)
      if (index + 1 >= questions.length) setStage('done')
      else setIndex(i => i + 1)
    }, 400)
  }

  const submit = () => {
    const text = given.trim()
    if (!text || feedback || stage !== 'playing') return
    const verdict = judgeAnswer(questions[index].answer, text)
    if (verdict === 'prompt' && !prompted) {
      setPrompted(true)
      setGiven('')
      return
    }
    const final = verdict === 'prompt' ? 'incorrect' : verdict
    advance({ given: text, verdict: final, correct: final === 'correct' })
  }

  const skip = () => {
    if (feedback || stage !== 'playing') return
    advance({ given: '', verdict: 'skipped', correct: false })
  }

  const toggleOverride = i => {
    setResults(r => r.map((x, j) => (j === i ? { ...x, correct: !x.correct, overridden: !x.overridden } : x)))
  }

  useEffect(() => {
    if (stage !== 'ready') return
    function onKey(e) {
      if (e.key !== 'Enter' || e.repeat) return
      if (['INPUT', 'BUTTON', 'A'].includes(document.activeElement?.tagName)) return
      e.preventDefault()
      start()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [stage])

  if (stage === 'ready') {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 text-center">
        <h2 className="text-xl font-semibold mb-1">{set.title}</h2>
        {set.intro && <p className="text-gray-400 mb-2">{set.intro}</p>}
        <p className="text-sm text-gray-500 mb-5">{questions.length} questions · {ROUND_TIME} seconds</p>
        <button
          onClick={start}
          className="px-8 py-3 bg-amber-600 text-white rounded-lg font-bold text-lg hover:bg-amber-500 transition-colors"
        >
          Start (Enter)
        </button>
      </div>
    )
  }

  if (stage === 'done') {
    const correct = results.filter(r => r.correct).length
    return (
      <div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6 text-center">
          <div className="text-5xl font-bold text-amber-400 mb-2">{correct}/{questions.length}</div>
          <p className="text-gray-500">{set.title}</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 sm:p-6 mb-6">
          <h2 className="font-semibold mb-1">Results</h2>
          {set.intro && <p className="text-xs text-gray-500 mb-3">{set.intro}</p>}
          <div className="space-y-2">
            {questions.map((q, i) => {
              const r = results[i]
              return (
                <div key={i} className={`p-2 rounded text-sm ${
                  !r ? 'bg-gray-800/50' : r.correct ? 'bg-emerald-500/10' : r.verdict === 'close' ? 'bg-amber-500/10' : 'bg-red-500/10'
                }`}>
                  <div className="flex justify-between items-start gap-4">
                    <span className="text-gray-300">{i + 1}. {q.question}</span>
                    <AnswerText
                      answer={q.answer}
                      className={`shrink-0 text-right max-w-[45%] ${!r ? 'text-gray-400' : r.correct ? 'text-emerald-400' : 'text-red-400'}`}
                    />
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs">
                    {!r && <span className="text-gray-500">Not reached</span>}
                    {r && !r.correct && (
                      <span className={r.verdict === 'close' ? 'text-amber-400' : 'text-red-400'}>
                        {r.given ? `${r.verdict === 'close' ? 'Close! ' : ''}You said: ${r.given}` : 'Skipped'}
                      </span>
                    )}
                    {r?.overridden && <span className="text-gray-500">Marked correct (you said: {r.given})</span>}
                    {r?.given && (r.overridden || !r.correct) && (
                      <button
                        onClick={() => toggleOverride(i)}
                        className="px-2 py-0.5 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
                      >
                        {r.overridden ? 'Undo' : 'I was right'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {footer && <div className="flex flex-wrap justify-center gap-3">{footer}</div>}
      </div>
    )
  }

  const q = questions[index]
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-500">
          <span className="text-emerald-400 font-medium">{results.filter(r => r.correct).length} correct</span>
          <span className="mx-1">&middot;</span>
          <span>Question {index + 1}/{questions.length}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className={`text-2xl font-mono font-bold ${timeLeft !== null && timeLeft <= 10 ? 'text-red-400' : 'text-gray-300'}`}>
            {timeLeft ?? ROUND_TIME}s
          </div>
          <button
            onClick={end}
            className="px-3 py-1 text-xs bg-gray-700 text-gray-400 rounded font-medium hover:bg-gray-600 transition-colors"
          >
            End Round
          </button>
        </div>
      </div>

      {set.intro && <p className="text-sm text-gray-500 mb-2">{set.intro}</p>}
      <div className={`bg-gray-900 border rounded-lg p-6 mb-4 transition-colors ${
        feedback === 'correct'
          ? 'border-emerald-500'
          : feedback === 'close'
            ? 'border-amber-500'
            : feedback === 'incorrect'
              ? 'border-red-500'
              : 'border-gray-800'
      }`}>
        <p className="text-lg font-medium">{q.question}</p>
      </div>

      {prompted && <p className="text-sm text-amber-400 mb-2">Prompt — can you be more specific?</p>}
      <form onSubmit={e => { e.preventDefault(); submit() }} className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={given}
          onChange={e => setGiven(e.target.value)}
          placeholder="Type answer and press Enter..."
          className="flex-1 min-w-0 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 text-lg"
          autoComplete="off"
        />
        <button
          type="button"
          onClick={skip}
          className="px-4 py-3 bg-gray-700 text-gray-400 rounded-lg font-medium hover:bg-gray-600 transition-colors"
        >
          Skip
        </button>
      </form>
    </div>
  )
}
