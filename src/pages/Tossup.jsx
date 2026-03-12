import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { tossups, lightning } from '../data/loader'
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

const normalize = s => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
function checkAnswer(correctAnswer, givenAnswer) {
  const c = normalize(correctAnswer)
  const g = normalize(givenAnswer)
  return c === g || c.includes(g) || g.includes(c)
}

export default function Tossup() {
  const { recordTossup, getTossupStats } = useProgress()
  const { filterByLevel } = useLevel()
  const filteredTossups = filterByLevel(tossups)
  const filteredLightning = filterByLevel(lightning)
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
  const [bonusMode, setBonusMode] = useState(false)
  const [bonusData, setBonusData] = useState(null)
  const [bonusAnswer, setBonusAnswer] = useState('')

  const inputRef = useRef(null)
  const bonusInputRef = useRef(null)
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
    setBonusData(null)
    setBonusAnswer('')
  }, [filteredKey])

  const roundQuestions = shuffled.slice(0, ROUND_SIZE)
  const question = roundQuestions[questionIndex]
  const words = question ? question.question.split(' ') : []

  const resetQuestion = useCallback(() => {
    setRevealedWords(0)
    setAnswer('')
    setResult(null)
    setBuzzed(false)
    setPaused(true)
    setBonusData(null)
    setBonusAnswer('')
  }, [])

  const startRound = useCallback(() => {
    setShuffled(shuffle(filteredTossups))
    setQuestionIndex(0)
    setRoundResults([])
    resetQuestion()
    setPhase('playing')
  }, [filteredTossups, resetQuestion])

  const startReveal = useCallback(() => {
    setPaused(false)
    setRevealedWords(1)
  }, [])

  // Word reveal timer
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
    const isCorrect = checkAnswer(question.answer, answer)
    setResult(isCorrect ? 'correct' : 'incorrect')

    // Record immediately unless bonus mode with a correct answer (deferred until bonus completes)
    if (!bonusMode || !isCorrect) {
      setRoundResults(prev => [...prev, {
        question: question.question,
        answer: question.answer,
        category: question.category,
        given: answer,
        correct: isCorrect,
        tossupPoints: isCorrect ? 10 : 0,
        bonus: null,
      }])
    }
    recordTossup(isCorrect)
  }, [answer, question, recordTossup, bonusMode])

  const startBonus = useCallback(() => {
    if (filteredLightning.length === 0) return
    const topic = filteredLightning[Math.floor(Math.random() * filteredLightning.length)]
    const shuffledQs = shuffle(topic.questions)
    setBonusData({
      topic: topic.title,
      questions: shuffledQs.slice(0, 4),
      phase: 'answering', // answering | result | summary
      index: 0,
      results: [],
    })
    setBonusAnswer('')
    setTimeout(() => bonusInputRef.current?.focus(), 0)
  }, [filteredLightning])

  const submitBonusAnswer = useCallback(() => {
    if (!bonusAnswer.trim() || !bonusData) return
    const bq = bonusData.questions[bonusData.index]
    const isCorrect = checkAnswer(bq.answer, bonusAnswer)
    setBonusData(prev => ({
      ...prev,
      phase: 'result',
      results: [...prev.results, {
        question: bq.question,
        answer: bq.answer,
        given: bonusAnswer,
        correct: isCorrect,
      }],
    }))
  }, [bonusAnswer, bonusData])

  const nextBonusPart = useCallback(() => {
    if (!bonusData) return
    if (bonusData.index + 1 >= 4) {
      // All 4 parts done — record the full tossup+bonus result
      const correctCount = bonusData.results.filter(r => r.correct).length
      const bonusPoints = correctCount * 5 + (correctCount === 4 ? 20 : 0)
      setRoundResults(prev => [...prev, {
        question: question.question,
        answer: question.answer,
        category: question.category,
        given: answer,
        correct: true,
        tossupPoints: 10,
        bonus: {
          topic: bonusData.topic,
          results: bonusData.results,
          points: bonusPoints,
        },
      }])
      setBonusData(prev => ({ ...prev, phase: 'summary' }))
    } else {
      setBonusData(prev => ({
        ...prev,
        phase: 'answering',
        index: prev.index + 1,
      }))
      setBonusAnswer('')
      setTimeout(() => bonusInputRef.current?.focus(), 0)
    }
  }, [bonusData, question, answer])

  const skipBonus = useCallback(() => {
    setRoundResults(prev => [...prev, {
      question: question.question,
      answer: question.answer,
      category: question.category,
      given: answer,
      correct: true,
      tossupPoints: 10,
      bonus: null,
    }])
    if (questionIndex + 1 >= roundQuestions.length) {
      setPhase('done')
      return
    }
    setQuestionIndex(i => i + 1)
    resetQuestion()
  }, [question, answer, questionIndex, roundQuestions.length, resetQuestion])

  const nextQuestion = useCallback(() => {
    if (questionIndex + 1 >= roundQuestions.length) {
      setPhase('done')
      return
    }
    setQuestionIndex(i => i + 1)
    resetQuestion()
  }, [questionIndex, roundQuestions.length, resetQuestion])

  // Keyboard: Enter to buzz (only when not in bonus flow)
  useEffect(() => {
    function handleKey(e) {
      if (phase !== 'playing') return
      if (e.key === 'Enter' && !buzzed && !paused && !result && !bonusData) {
        e.preventDefault()
        buzz()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [buzz, buzzed, paused, result, phase, bonusData])

  const revealedText = words.slice(0, revealedWords).join(' ')

  // Running score
  const runningTotal = roundResults.reduce(
    (sum, r) => sum + r.tossupPoints + (r.bonus?.points || 0), 0
  )

  // ─── Setup phase ───
  if (phase === 'setup') {
    const hasBonusData = filteredLightning.length > 0
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Tossup Practice</h1>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
          <h2 className="font-semibold mb-1">How it works:</h2>
          <p className="text-sm text-gray-400 mb-4">
            {bonusMode
              ? `A round of ${ROUND_SIZE} tossup questions with 4-part bonus sets — just like AGQBA Round 2. Get the tossup right to earn bonus points!`
              : `A round of ${ROUND_SIZE} tossup questions — just like AGQBA Rounds 1 and 4. Each question reveals word by word. Buzz in when you know the answer.`}
          </p>
          {bonusMode && (
            <p className="text-sm text-gray-500 mb-4">
              Bonus scoring: 5 pts per correct part, +20 pt sweep bonus for all 4.
            </p>
          )}
          {hasBonusData && (
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setBonusMode(false)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  !bonusMode
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                Tossup Only
              </button>
              <button
                onClick={() => setBonusMode(true)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  bonusMode
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                Tossup + Bonus
              </button>
            </div>
          )}
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
    const tossupCorrect = roundResults.filter(r => r.correct).length
    const tossupPoints = roundResults.reduce((sum, r) => sum + r.tossupPoints, 0)
    const bonusPoints = roundResults.reduce((sum, r) => sum + (r.bonus?.points || 0), 0)
    const totalPoints = tossupPoints + bonusPoints

    return (
      <div>
        <h1 className="text-2xl font-bold mb-1">Round Complete!</h1>
        <p className="text-gray-500 text-sm mb-6">
          {bonusMode ? 'Tossup + Bonus Practice' : 'Tossup Practice'}
        </p>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6 text-center">
          <div className="text-5xl font-bold text-emerald-400 mb-2">
            {tossupCorrect}/{roundResults.length}
          </div>
          <p className="text-gray-500">
            {totalPoints} points earned
            {bonusMode && bonusPoints > 0 && (
              <span className="block text-xs mt-1">
                ({tossupPoints} tossup + {bonusPoints} bonus)
              </span>
            )}
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
                    {r.correct ? `+${r.tossupPoints + (r.bonus?.points || 0)}` : '0'}
                  </span>
                </div>
                {!r.correct && r.given && (
                  <p className="text-red-400 text-xs mt-1 ml-5">You said: {r.given}</p>
                )}
                {r.bonus && (
                  <div className="mt-2 ml-5 border-l-2 border-gray-700 pl-3">
                    <p className="text-xs text-gray-500 mb-1">Bonus: {r.bonus.topic}</p>
                    {r.bonus.results.map((br, bi) => (
                      <div key={bi} className="flex items-center gap-2 text-xs">
                        <span className={br.correct ? 'text-emerald-400' : 'text-red-400'}>
                          {br.correct ? '+5' : '0'}
                        </span>
                        <span className="text-gray-400">{br.answer}</span>
                        {!br.correct && br.given && (
                          <span className="text-red-400/70">(you said: {br.given})</span>
                        )}
                      </div>
                    ))}
                    {r.bonus.results.filter(br => br.correct).length === 4 && (
                      <p className="text-xs text-amber-400 mt-1">Sweep bonus: +20</p>
                    )}
                  </div>
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
        <h1 className="text-2xl font-bold">
          {bonusMode ? 'Tossup + Bonus' : 'Tossup Practice'}
        </h1>
        <div className="text-sm text-gray-500">
          {runningTotal} pts
        </div>
      </div>

      <div className="mb-4 text-sm text-gray-500">
        <span className="text-emerald-400 font-medium">
          {roundResults.filter(r => r.correct).length} correct
        </span>
        <span className="mx-1">&middot;</span>
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
              onSubmit={e => { e.preventDefault(); submitAnswer() }}
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

      {/* Result + Bonus flow */}
      {result && (
        <div className="mb-6">
          {/* Tossup result banner */}
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

          {/* Full question (hide during active bonus) */}
          {(!bonusMode || result === 'incorrect' || !bonusData || bonusData.phase === 'summary') && (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-4 text-sm text-gray-400">
              <p className="font-medium text-gray-300 mb-1">Full question:</p>
              <p>{question.question}</p>
            </div>
          )}

          {/* Bonus: Start / Skip buttons */}
          {bonusMode && result === 'correct' && !bonusData && (
            <div className="flex justify-center gap-3">
              <button
                onClick={startBonus}
                className="px-6 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-500 transition-colors"
              >
                Start Bonus
              </button>
              <button
                onClick={skipBonus}
                className="px-6 py-2 bg-gray-700 text-gray-300 rounded-lg font-medium hover:bg-gray-600 transition-colors"
              >
                Skip
              </button>
            </div>
          )}

          {/* Bonus: Answering a part */}
          {bonusData && bonusData.phase === 'answering' && (
            <div className="bg-gray-900 border border-amber-500/30 rounded-lg p-5 mb-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-amber-400 font-semibold text-sm">Bonus: {bonusData.topic}</p>
                <span className="text-xs text-gray-500">Part {bonusData.index + 1} of 4</span>
              </div>
              {bonusData.results.length > 0 && (
                <div className="mb-3 space-y-1">
                  {bonusData.results.map((br, bi) => (
                    <div key={bi} className="flex items-center gap-2 text-xs">
                      <span className={br.correct ? 'text-emerald-400' : 'text-red-400'}>
                        {br.correct ? '+5' : '0'}
                      </span>
                      <span className="text-gray-500">{br.answer}</span>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-gray-200 mb-3">{bonusData.questions[bonusData.index].question}</p>
              <form
                onSubmit={e => { e.preventDefault(); submitBonusAnswer() }}
                className="flex gap-2"
              >
                <input
                  ref={bonusInputRef}
                  type="text"
                  value={bonusAnswer}
                  onChange={e => setBonusAnswer(e.target.value)}
                  placeholder="Bonus answer..."
                  className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  autoComplete="off"
                />
                <button
                  type="submit"
                  className="px-6 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-500 transition-colors"
                >
                  Submit
                </button>
              </form>
            </div>
          )}

          {/* Bonus: Result for current part */}
          {bonusData && bonusData.phase === 'result' && (
            <div className="bg-gray-900 border border-amber-500/30 rounded-lg p-5 mb-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-amber-400 font-semibold text-sm">Bonus: {bonusData.topic}</p>
                <span className="text-xs text-gray-500">Part {bonusData.index + 1} of 4</span>
              </div>
              <div className="mb-3 space-y-1">
                {bonusData.results.map((br, bi) => {
                  const isCurrent = bi === bonusData.results.length - 1
                  return (
                    <div key={bi} className={`flex items-center gap-2 ${isCurrent ? 'text-sm' : 'text-xs'}`}>
                      <span className={br.correct ? 'text-emerald-400' : 'text-red-400'}>
                        {br.correct ? '+5' : '0'}
                      </span>
                      <span className={isCurrent ? 'text-gray-200' : 'text-gray-500'}>
                        {br.answer}
                      </span>
                      {!br.correct && isCurrent && br.given && (
                        <span className="text-red-400/70 text-xs">(you said: {br.given})</span>
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="text-center">
                <button
                  onClick={nextBonusPart}
                  className="px-6 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-500 transition-colors"
                >
                  {bonusData.index + 1 >= 4 ? 'See Bonus Results' : 'Next Part'}
                </button>
              </div>
            </div>
          )}

          {/* Bonus: Summary */}
          {bonusData && bonusData.phase === 'summary' && (() => {
            const bc = bonusData.results.filter(r => r.correct).length
            const bp = bc * 5 + (bc === 4 ? 20 : 0)
            return (
              <div className="bg-gray-900 border border-amber-500/30 rounded-lg p-5 mb-4">
                <p className="text-amber-400 font-semibold text-sm mb-3">
                  Bonus Complete: {bonusData.topic}
                </p>
                <div className="space-y-1 mb-3">
                  {bonusData.results.map((br, bi) => (
                    <div key={bi} className="flex items-center gap-2 text-sm">
                      <span className={br.correct ? 'text-emerald-400' : 'text-red-400'}>
                        {br.correct ? '+5' : '0'}
                      </span>
                      <span className="text-gray-300">{br.answer}</span>
                      {!br.correct && br.given && (
                        <span className="text-red-400/70 text-xs">(you said: {br.given})</span>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-sm text-gray-400">
                  {bc}/4 correct
                  {bc === 4 && <span className="text-amber-400 font-medium"> — Sweep!</span>}
                  <span className="ml-2 text-amber-400 font-medium">+{bp} pts</span>
                </p>
              </div>
            )
          })()}

          {/* Next Question (no bonus, incorrect, or bonus complete) */}
          {(!bonusMode || result === 'incorrect' || (bonusData && bonusData.phase === 'summary')) && (
            <div className="text-center">
              <button
                onClick={nextQuestion}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-500 transition-colors"
              >
                {questionIndex + 1 >= roundQuestions.length ? 'See Results' : 'Next Question'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
