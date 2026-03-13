import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { tossups, lightning, flashcardDecks } from '../data/loader'
import { useProgress } from '../hooks/useProgress'
import { useLevel } from '../context/LevelContext'
import { checkAnswer, isCloseAnswer } from '../utils/answerCheck'

const TOSSUP_ROUND_SIZE = 20
const BONUS_ROUND_SIZE = 4
const ANSWER_TIME = 10
const BUZZ_WINDOW = 5

// Map tossup categories to relevant flashcard deck IDs
const CATEGORY_DECKS = {
  'Science': ['biology-terms', 'chemistry-terms', 'physics-terms'],
  'History': ['world-history', 'famous-battles', 'civil-rights'],
  'Literature': ['authors-works', 'american-literature', 'shakespeare'],
  'Geography': ['state-capitals', 'world-capitals', 'geography-physical'],
  'Fine Arts': ['art-music', 'famous-paintings', 'classical-composers'],
  'Math': ['math-vocabulary', 'math-formulas'],
  'Mythology': ['greek-roman-mythology', 'norse-mythology', 'egyptian-mythology'],
  'Social Studies': ['civics', 'economics', 'presidents', 'supreme-court'],
}

function getStudyDecks(roundResults) {
  const missedCategories = new Set(roundResults.filter(r => !r.correct).map(r => r.category))
  const decks = []
  for (const cat of missedCategories) {
    const deckIds = CATEGORY_DECKS[cat] || []
    for (const id of deckIds) {
      const deck = flashcardDecks.find(d => d.id === id)
      if (deck && !decks.some(d => d.id === id)) decks.push(deck)
    }
  }
  return decks
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// AGQBA category weights for bonus topic selection (approximate competition frequency)
const AGQBA_WEIGHTS = {
  'History': 19, 'Science': 16, 'Literature': 16, 'Fine Arts': 8,
  'Geography': 8, 'Math': 7, 'Vocabulary': 5, 'Social Science': 4,
  'Religion': 4, 'Mythology': 3,
}

function pickWeightedTopic(topics) {
  const byCategory = {}
  for (const t of topics) {
    const cat = t.category || 'Miscellaneous'
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(t)
  }
  const categories = Object.keys(byCategory)
  const weights = categories.map(c => AGQBA_WEIGHTS[c] || 3)
  const total = weights.reduce((s, w) => s + w, 0)
  let r = Math.random() * total
  let picked = categories[0]
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i]
    if (r <= 0) { picked = categories[i]; break }
  }
  const pool = byCategory[picked]
  return pool[Math.floor(Math.random() * pool.length)]
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
  const [buzzTimeLeft, setBuzzTimeLeft] = useState(null)
  const [closeAnswer, setCloseAnswer] = useState(false)
  const [bonusTimeLeft, setBonusTimeLeft] = useState(null)
  const [timedOut, setTimedOut] = useState(false)
  const [buzzWindowLeft, setBuzzWindowLeft] = useState(null)

  const inputRef = useRef(null)
  const bonusInputRef = useRef(null)
  const timerRef = useRef(null)
  const questionRef = useRef(null)

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
    setBuzzTimeLeft(null)
    setCloseAnswer(false)
    setBonusTimeLeft(null)
    setTimedOut(false)
    setBuzzWindowLeft(null)
  }, [filteredKey])

  const roundSize = bonusMode ? BONUS_ROUND_SIZE : TOSSUP_ROUND_SIZE
  const roundQuestions = shuffled.slice(0, roundSize)
  const question = roundQuestions[questionIndex]
  const words = question ? question.question.split(' ') : []

  // Keep ref current for timeout handlers
  questionRef.current = question

  const resetQuestion = useCallback(() => {
    setRevealedWords(0)
    setAnswer('')
    setResult(null)
    setBuzzed(false)
    setPaused(true)
    setBonusData(null)
    setBonusAnswer('')
    setBuzzTimeLeft(null)
    setCloseAnswer(false)
    setBonusTimeLeft(null)
    setTimedOut(false)
    setBuzzWindowLeft(null)
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

  // Buzz window timer — starts when question finishes revealing
  const questionFullyRevealed = !paused && !buzzed && !result && revealedWords >= words.length && words.length > 0
  useEffect(() => {
    if (!questionFullyRevealed) return
    setBuzzWindowLeft(BUZZ_WINDOW)
    const id = setInterval(() => setBuzzWindowLeft(p => (p > 0 ? p - 1 : p)), 1000)
    return () => clearInterval(id)
  }, [questionFullyRevealed])

  // Auto-skip when buzz window expires (didn't buzz in time)
  const showAnswer = useCallback(() => {
    const q = questionRef.current
    if (!q) return
    setResult('incorrect')
    setTimedOut(true)
    setBuzzWindowLeft(null)
    setRoundResults(prev => [...prev, {
      question: q.question,
      answer: q.answer,
      category: q.category,
      given: '',
      correct: false,
      tossupPoints: 0,
      bonus: null,
    }])
    recordTossup(false)
  }, [recordTossup])

  useEffect(() => {
    if (buzzWindowLeft !== 0 || !questionFullyRevealed) return
    showAnswer()
  }, [buzzWindowLeft, questionFullyRevealed, showAnswer])

  // Buzz answer timer countdown
  useEffect(() => {
    if (!buzzed || result) return
    setBuzzTimeLeft(ANSWER_TIME)
    const id = setInterval(() => setBuzzTimeLeft(p => (p > 0 ? p - 1 : p)), 1000)
    return () => clearInterval(id)
  }, [buzzed, result])

  // Auto-fail when buzz timer expires
  useEffect(() => {
    if (buzzTimeLeft !== 0 || !buzzed || result) return
    const q = questionRef.current
    if (!q) return
    setResult('incorrect')
    setTimedOut(true)
    setRoundResults(prev => [...prev, {
      question: q.question,
      answer: q.answer,
      category: q.category,
      given: '',
      correct: false,
      tossupPoints: 0,
      bonus: null,
    }])
    recordTossup(false)
  }, [buzzTimeLeft, buzzed, result, recordTossup])

  const buzz = useCallback(() => {
    if (buzzed || result) return
    clearInterval(timerRef.current)
    setBuzzed(true)
    setBuzzWindowLeft(null)
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [buzzed, result])

  const submitAnswer = useCallback(() => {
    if (!answer.trim()) return
    const isCorrect = checkAnswer(question.answer, answer)
    const isClose = !isCorrect && isCloseAnswer(question.answer, answer)
    setResult(isCorrect ? 'correct' : 'incorrect')
    setCloseAnswer(isClose)
    setTimedOut(false)

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
    const topic = pickWeightedTopic(filteredLightning)
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
    const isClose = !isCorrect && isCloseAnswer(bq.answer, bonusAnswer)
    setBonusData(prev => ({
      ...prev,
      phase: 'result',
      results: [...prev.results, {
        question: bq.question,
        answer: bq.answer,
        given: bonusAnswer,
        correct: isCorrect,
        close: isClose,
      }],
    }))
  }, [bonusAnswer, bonusData])

  // Bonus answer timer countdown
  const bonusPhase = bonusData?.phase
  const bonusIdx = bonusData?.index ?? -1
  const bonusDataRef = useRef(bonusData)
  bonusDataRef.current = bonusData

  useEffect(() => {
    if (bonusPhase !== 'answering') return
    setBonusTimeLeft(ANSWER_TIME)
    const id = setInterval(() => setBonusTimeLeft(p => (p > 0 ? p - 1 : p)), 1000)
    return () => clearInterval(id)
  }, [bonusPhase, bonusIdx])

  // Auto-fail when bonus timer expires
  useEffect(() => {
    if (bonusTimeLeft !== 0 || bonusPhase !== 'answering') return
    const bd = bonusDataRef.current
    if (!bd) return
    const bq = bd.questions[bd.index]
    setBonusData(prev => ({
      ...prev,
      phase: 'result',
      results: [...prev.results, {
        question: bq.question,
        answer: bq.answer,
        given: '',
        correct: false,
        close: false,
      }],
    }))
  }, [bonusTimeLeft, bonusPhase])

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

  const finishRound = useCallback(() => {
    clearInterval(timerRef.current)
    setPhase('done')
  }, [])

  // Keyboard: Enter to proceed through all non-input states
  useEffect(() => {
    function handleKey(e) {
      if (phase !== 'playing' || e.key !== 'Enter') return
      // Don't intercept when user is typing in an input
      if (document.activeElement?.tagName === 'INPUT') return

      e.preventDefault()
      if (paused && !result) {
        startReveal()
      } else if (!buzzed && !paused && !result && !bonusData) {
        buzz()
      } else if (result === 'correct' && bonusMode && !bonusData) {
        startBonus()
      } else if (bonusData?.phase === 'result') {
        nextBonusPart()
      } else if (result && (!bonusMode || result === 'incorrect' || bonusData?.phase === 'summary')) {
        nextQuestion()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [buzz, buzzed, paused, result, phase, bonusData, bonusMode, startReveal, startBonus, nextBonusPart, nextQuestion])

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
              ? `${BONUS_ROUND_SIZE} tossup questions with 4-part bonus sets — just like AGQBA Round 2. Get the tossup right to earn bonus points!`
              : `A round of ${TOSSUP_ROUND_SIZE} tossup questions — just like AGQBA Rounds 1 and 4. Each question reveals word by word. Buzz in when you know the answer.`}
          </p>
          <p className="text-sm text-gray-500 mb-4">
            {BUZZ_WINDOW}s to buzz after the question finishes, then {ANSWER_TIME}s to type your answer.
            {bonusMode && ' Bonus scoring: 5 pts per correct part, +20 pt sweep bonus for all 4.'}
          </p>
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
            Start Round ({bonusMode ? BONUS_ROUND_SIZE : TOSSUP_ROUND_SIZE} questions)
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
                {!r.correct && !r.given && (
                  <p className="text-red-400 text-xs mt-1 ml-5">Time&apos;s up</p>
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
                        {!br.correct && !br.given && (
                          <span className="text-red-400/70">(time&apos;s up)</span>
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

        {(() => {
          const studyDecks = getStudyDecks(roundResults)
          if (studyDecks.length === 0) return null
          return (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
              <h2 className="font-semibold mb-3">Study these topics</h2>
              <div className="flex flex-wrap gap-2">
                {studyDecks.map(d => (
                  <Link
                    key={d.id}
                    to={`/flashcards/${d.id}`}
                    className="px-3 py-1.5 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-lg text-sm font-medium hover:bg-indigo-600/30 transition-colors"
                  >
                    {d.title}
                  </Link>
                ))}
              </div>
            </div>
          )
        })()}

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
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{runningTotal} pts</span>
          {roundResults.length > 0 && (
            <button
              onClick={finishRound}
              className="px-3 py-1 text-xs bg-gray-700 text-gray-400 rounded font-medium hover:bg-gray-600 transition-colors"
            >
              Finish Round
            </button>
          )}
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
            <div className="flex justify-center items-center gap-4">
              <button
                onClick={buzz}
                className="px-8 py-3 bg-red-600 text-white rounded-lg font-bold text-lg hover:bg-red-500 transition-colors"
              >
                BUZZ (Enter)
              </button>
              {buzzWindowLeft !== null && (
                <>
                  <div className={`text-lg font-mono font-bold ${
                    buzzWindowLeft <= 2 ? 'text-red-400 animate-pulse' : 'text-gray-400'
                  }`}>
                    {buzzWindowLeft}s
                  </div>
                  <button
                    onClick={showAnswer}
                    className="px-4 py-2 bg-gray-700 text-gray-400 rounded-lg font-medium hover:bg-gray-600 transition-colors text-sm"
                  >
                    Show Answer
                  </button>
                </>
              )}
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
              {buzzTimeLeft !== null && (
                <div className={`flex items-center justify-center w-12 text-lg font-mono font-bold ${
                  buzzTimeLeft <= 3 ? 'text-red-400 animate-pulse' : 'text-gray-400'
                }`}>
                  {buzzTimeLeft}s
                </div>
              )}
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
                : closeAnswer
                  ? 'bg-amber-500/10 border-amber-500/30'
                  : 'bg-red-500/10 border-red-500/30'
            }`}
          >
            <p className={`font-semibold ${
              result === 'correct'
                ? 'text-emerald-400'
                : closeAnswer
                  ? 'text-amber-400'
                  : 'text-red-400'
            }`}>
              {result === 'correct'
                ? 'Correct! +10 points'
                : timedOut
                  ? "Time's up!"
                  : closeAnswer
                    ? 'Close! Check your spelling'
                    : 'Incorrect'}
            </p>
            <p className="text-sm mt-1">
              <span className="text-gray-500">Answer: </span>
              <span className="font-medium">{question.answer}</span>
              <span className="text-xs text-gray-600 ml-2">{question.category}</span>
            </p>
            {result === 'incorrect' && answer.trim() && (
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
                {bonusTimeLeft !== null && (
                  <div className={`flex items-center justify-center w-12 text-lg font-mono font-bold ${
                    bonusTimeLeft <= 3 ? 'text-red-400 animate-pulse' : 'text-gray-400'
                  }`}>
                    {bonusTimeLeft}s
                  </div>
                )}
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
                      <span className={br.correct ? 'text-emerald-400' : br.close ? 'text-amber-400' : 'text-red-400'}>
                        {br.correct ? '+5' : '0'}
                      </span>
                      <span className={isCurrent ? 'text-gray-200' : 'text-gray-500'}>
                        {br.answer}
                      </span>
                      {!br.correct && isCurrent && br.given && (
                        <span className={`text-xs ${br.close ? 'text-amber-400/70' : 'text-red-400/70'}`}>
                          ({br.close ? 'close! ' : ''}you said: {br.given})
                        </span>
                      )}
                      {!br.correct && isCurrent && !br.given && (
                        <span className="text-red-400/70 text-xs">(time&apos;s up)</span>
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
                        <span className={`text-xs ${br.close ? 'text-amber-400/70' : 'text-red-400/70'}`}>
                          ({br.close ? 'close! ' : ''}you said: {br.given})
                        </span>
                      )}
                      {!br.correct && !br.given && (
                        <span className="text-red-400/70 text-xs">(time&apos;s up)</span>
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
