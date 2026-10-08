import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { judgeAnswer } from '../../utils/jhAnswerCheck'
import { useCountdown } from './useCountdown'
import AnswerText from './AnswerText'

const WORD_MS = 300
const BUZZ_WINDOW = 5
const MATH_BUZZ_WINDOW = 30
const ANSWER_TIME = 10
const MATH_BONUS_TIME = 30
const TOSSUP_POINTS = 10
const BONUS_PART_POINTS = 5
const SWEEP_BONUS = 20

const VERDICT_TEXT = {
  correct: 'Correct!',
  incorrect: 'Incorrect',
  close: 'Close! Check your spelling',
  timeout: "Time's up!",
  nobuzz: 'No buzz',
}

function bonusPoints(parts) {
  const n = parts.filter(p => p.correct).length
  return n * BONUS_PART_POINTS + (n === 4 ? SWEEP_BONUS : 0)
}

function summarize(results) {
  const tossupResults = results.filter(r => r.tossup)
  const correct = tossupResults.filter(r => r.correct).length
  const bonus = results.reduce((sum, r) => sum + (r.bonus ? bonusPoints(r.bonus.parts) : 0), 0)
  return { correct, total: tossupResults.length, points: correct * TOSSUP_POINTS + bonus, bonusPoints: bonus }
}

// Enter advances the round, except while typing or when a button/link has focus
// (Enter already activates those)
function useEnterKey(handler) {
  const handlerRef = useRef(handler)
  useEffect(() => { handlerRef.current = handler })
  useEffect(() => {
    function onKey(e) {
      if (e.key !== 'Enter' || e.repeat) return
      if (['INPUT', 'TEXTAREA', 'BUTTON', 'A', 'SELECT'].includes(document.activeElement?.tagName)) return
      if (handlerRef.current?.()) e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

function PromptNote() {
  return (
    <p className="text-sm text-amber-400 mb-2">Prompt — can you be more specific?</p>
  )
}

function Timer({ left, warnAt = 3 }) {
  if (left === null) return null
  return (
    <div className={`flex items-center justify-center w-12 text-lg font-mono font-bold ${
      left <= warnAt ? 'text-red-400 animate-pulse' : 'text-gray-400'
    }`}>
      {left}s
    </div>
  )
}

// ─── One 4-part bonus ───

function BonusPlayer({ set, label = 'Bonus', onDone }) {
  const [part, setPart] = useState(0)
  const [given, setGiven] = useState('')
  const [results, setResults] = useState([])
  const [phase, setPhase] = useState('answering') // answering | result
  const [prompted, setPrompted] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const inputRef = useRef(null)

  const record = useCallback((verdict, text) => {
    setResults(prev => [...prev, { given: text, verdict, correct: verdict === 'correct' }])
    setPhase('result')
  }, [])

  const timeLeft = useCountdown(
    set.math ? MATH_BONUS_TIME : ANSWER_TIME,
    phase === 'answering',
    `${part}-${attempt}`,
    () => record('timeout', given.trim()),
  )

  useEffect(() => {
    if (phase === 'answering') inputRef.current?.focus()
  }, [phase, part, attempt])

  const submit = () => {
    const text = given.trim()
    if (!text || phase !== 'answering') return
    const verdict = judgeAnswer(set.parts[part].answer, text)
    if (verdict === 'prompt' && !prompted) {
      setPrompted(true)
      setGiven('')
      setAttempt(a => a + 1)
      return
    }
    record(verdict === 'prompt' ? 'incorrect' : verdict, text)
  }

  const override = () => {
    setResults(prev => prev.map((r, i) => (i === prev.length - 1 ? { ...r, correct: true, overridden: true } : r)))
  }

  const next = () => {
    if (part + 1 >= set.parts.length) {
      onDone(results)
      return
    }
    setPart(p => p + 1)
    setGiven('')
    setPrompted(false)
    setPhase('answering')
  }

  useEnterKey(() => {
    if (phase !== 'result') return false
    next()
    return true
  })

  const last = results[results.length - 1]

  return (
    <div className="bg-gray-900 border border-amber-500/30 rounded-lg p-5 mb-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-amber-400 font-semibold text-sm">{label}</p>
        <span className="text-xs text-gray-500">Part {part + 1} of {set.parts.length}</span>
      </div>
      <p className="text-sm text-gray-400 mb-3">{set.leadin}</p>

      {results.length > 0 && (
        <div className="mb-3 space-y-1">
          {results.slice(0, phase === 'result' ? -1 : undefined).map((r, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <span className={`w-6 shrink-0 ${r.correct ? 'text-emerald-400' : 'text-red-400'}`}>
                {r.correct ? `+${BONUS_PART_POINTS}` : '0'}
              </span>
              <AnswerText answer={set.parts[i].answer} className="text-gray-500" />
            </div>
          ))}
        </div>
      )}

      <p className="text-gray-200 mb-3">{set.parts[part].question}</p>

      {phase === 'answering' ? (
        <>
          {prompted && <PromptNote />}
          <form onSubmit={e => { e.preventDefault(); submit() }} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={given}
              onChange={e => setGiven(e.target.value)}
              placeholder="Bonus answer..."
              className="flex-1 min-w-0 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              autoComplete="off"
            />
            <button
              type="submit"
              className="px-5 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-500 transition-colors"
            >
              Submit
            </button>
            <Timer left={timeLeft} />
          </form>
        </>
      ) : (
        <div>
          <div className={`rounded-lg p-3 mb-3 border text-sm ${
            last.correct ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'
          }`}>
            <p className={`font-semibold ${last.correct ? 'text-emerald-400' : 'text-red-400'}`}>
              {last.overridden ? `Marked correct +${BONUS_PART_POINTS}` : last.correct ? `Correct! +${BONUS_PART_POINTS}` : VERDICT_TEXT[last.verdict]}
            </p>
            <p className="mt-1">
              <span className="text-gray-500">Answer: </span>
              <AnswerText answer={set.parts[part].answer} />
            </p>
            {!last.correct && last.given && (
              <p className="mt-1"><span className="text-gray-500">You said: </span><span className="text-gray-400">{last.given}</span></p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={next}
              className="px-5 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-500 transition-colors"
            >
              {part + 1 >= set.parts.length ? 'Finish Bonus' : 'Next Part'} (Enter)
            </button>
            {!last.correct && last.given && (
              <button
                onClick={override}
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors"
              >
                I was right
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function BonusSummary({ bonus }) {
  const points = bonusPoints(bonus.parts)
  return (
    <div className="ml-5 mt-2 border-l-2 border-gray-700 pl-3 text-xs">
      <p className="text-gray-500 mb-1">Bonus: {bonus.set.leadin}</p>
      {bonus.parts.map((p, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className={`w-6 shrink-0 ${p.correct ? 'text-emerald-400' : 'text-red-400'}`}>
            {p.correct ? `+${BONUS_PART_POINTS}` : '0'}
          </span>
          <span>
            <AnswerText answer={bonus.set.parts[i].answer} className="text-gray-400" />
            {!p.correct && (
              <span className="text-red-400/70 ml-1">({p.given ? `you said: ${p.given}` : "time's up"})</span>
            )}
          </span>
        </div>
      ))}
      {points > 0 && (
        <p className="text-amber-400 mt-1">
          {points} bonus pts{bonus.parts.every(p => p.correct) ? ` (incl. +${SWEEP_BONUS} sweep)` : ''}
        </p>
      )}
    </div>
  )
}

// ─── Tossup round ───
//
// Plays `tossups` in order. Each correct tossup can earn a bonus from
// `bonuses`: in order (packet Quarter 2) or at random (`randomBonuses`). In
// order, any bonus sets not reached are offered at the end so every packet
// question gets played.

export default function TossupRound({ tossups, bonuses = [], randomBonuses = false, onFinish, footer }) {
  const [roundId] = useState(() => Date.now())
  const [index, setIndex] = useState(0)
  const [stage, setStage] = useState('ready') // ready | reading | answering | result | bonus | leftover | leftoverBonus | done
  const [revealed, setRevealed] = useState(0)
  const [given, setGiven] = useState('')
  const [prompted, setPrompted] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [current, setCurrent] = useState(null) // { verdict, given, overridden, bonus }
  const [results, setResults] = useState([])
  const [usedBonuses, setUsedBonuses] = useState([])
  const [activeBonus, setActiveBonus] = useState(null)
  const [leftoverQueue, setLeftoverQueue] = useState([])
  const inputRef = useRef(null)

  const tossup = tossups[index]
  const words = useMemo(() => (tossup ? tossup.question.split(' ') : []), [tossup])
  const fullyRevealed = stage === 'reading' && revealed >= words.length
  const isCorrect = !!current && (current.verdict === 'correct' || current.overridden)
  const canBonus = stage === 'result' && isCorrect && !current.bonus && bonuses.length > 0
    && (randomBonuses || usedBonuses.length < bonuses.length)
  const isLast = index + 1 >= tossups.length

  // Word-by-word reveal
  useEffect(() => {
    if (stage !== 'reading') return
    const id = setInterval(() => setRevealed(r => Math.min(r + 1, words.length)), WORD_MS)
    return () => clearInterval(id)
  }, [stage, words.length])

  const resolve = useCallback((verdict, text = '') => {
    setCurrent({ verdict, given: text, overridden: false, bonus: null })
    setStage('result')
  }, [])

  const buzzLeft = useCountdown(
    tossup?.math ? MATH_BUZZ_WINDOW : BUZZ_WINDOW,
    fullyRevealed,
    index,
    () => resolve('nobuzz'),
  )
  const answerLeft = useCountdown(
    ANSWER_TIME,
    stage === 'answering',
    `${index}-${attempt}`,
    () => resolve('timeout', given.trim()),
  )

  useEffect(() => {
    if (stage === 'answering') inputRef.current?.focus()
  }, [stage, attempt])

  const reportedRef = useRef(false)
  useEffect(() => {
    if (stage !== 'done' || reportedRef.current) return
    reportedRef.current = true
    const summary = summarize(results)
    if (summary.total > 0) onFinish?.(roundId, summary)
  }, [stage, results, roundId, onFinish])

  const start = () => {
    setRevealed(1)
    setStage('reading')
  }

  const buzz = () => {
    if (stage === 'reading') setStage('answering')
  }

  const submit = () => {
    const text = given.trim()
    if (!text || stage !== 'answering') return
    const verdict = judgeAnswer(tossup.answer, text)
    if (verdict === 'prompt' && !prompted) {
      setPrompted(true)
      setGiven('')
      setAttempt(a => a + 1)
      return
    }
    resolve(verdict === 'prompt' ? 'incorrect' : verdict, text)
  }

  const startBonus = () => {
    let pool = bonuses.map((_, i) => i).filter(i => !usedBonuses.includes(i))
    if (!pool.length) pool = bonuses.map((_, i) => i) // random pool exhausted — allow repeats
    const pick = randomBonuses ? pool[Math.floor(Math.random() * pool.length)] : pool[0]
    setUsedBonuses(u => (u.includes(pick) ? u : [...u, pick]))
    setActiveBonus(pick)
    setStage('bonus')
  }

  const finishBonus = parts => {
    setCurrent(c => ({ ...c, bonus: { set: bonuses[activeBonus], parts } }))
    setActiveBonus(null)
    setStage('result')
  }

  const next = () => {
    setResults(r => [...r, { tossup, ...current, correct: isCorrect }])
    if (!isLast) {
      setIndex(i => i + 1)
      setRevealed(0)
      setGiven('')
      setPrompted(false)
      setCurrent(null)
      setStage('ready')
      return
    }
    const unplayed = randomBonuses ? 0 : bonuses.length - usedBonuses.length
    setStage(unplayed > 0 ? 'leftover' : 'done')
  }

  const startLeftovers = () => {
    const queue = bonuses.map((_, i) => i).filter(i => !usedBonuses.includes(i))
    setUsedBonuses(bonuses.map((_, i) => i))
    setLeftoverQueue(queue)
    setActiveBonus(queue[0])
    setStage('leftoverBonus')
  }

  const finishLeftover = parts => {
    setResults(r => [...r, { tossup: null, bonus: { set: bonuses[activeBonus], parts } }])
    const rest = leftoverQueue.slice(1)
    if (rest.length) {
      setLeftoverQueue(rest)
      setActiveBonus(rest[0])
    } else {
      setActiveBonus(null)
      setStage('done')
    }
  }

  const finishEarly = () => {
    if (stage === 'result') setResults(r => [...r, { tossup, ...current, correct: isCorrect }])
    setStage('done')
  }

  useEnterKey(() => {
    if (stage === 'ready') start()
    else if (stage === 'reading') buzz()
    else if (stage === 'result') (canBonus ? startBonus : next)()
    else if (stage === 'leftover') startLeftovers()
    else return false
    return true
  })

  // ─── Done ───
  if (stage === 'done') {
    const summary = summarize(results)
    return (
      <div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6 text-center">
          <div className="text-5xl font-bold text-emerald-400 mb-2">
            {summary.correct}/{summary.total}
          </div>
          <p className="text-gray-500">
            {summary.points} points
            {summary.bonusPoints > 0 && (
              <span className="block text-xs mt-1">
                ({summary.correct * TOSSUP_POINTS} tossup + {summary.bonusPoints} bonus)
              </span>
            )}
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 sm:p-6 mb-6">
          <h2 className="font-semibold mb-3">Results</h2>
          <div className="space-y-2">
            {results.map((r, i) => (
              <div key={i} className={`p-3 rounded text-sm ${
                !r.tossup ? 'bg-amber-500/5' : r.correct ? 'bg-emerald-500/10' : 'bg-red-500/10'
              }`}>
                {r.tossup ? (
                  <>
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <span className="text-xs text-gray-500 mr-2">{i + 1}.</span>
                        <AnswerText answer={r.tossup.answer} />
                        <span className="text-xs text-gray-600 ml-2">{r.tossup.category}</span>
                      </div>
                      <span className={`font-medium shrink-0 ${r.correct ? 'text-emerald-400' : 'text-red-400'}`}>
                        {r.correct ? `+${TOSSUP_POINTS + (r.bonus ? bonusPoints(r.bonus.parts) : 0)}` : '0'}
                      </span>
                    </div>
                    {!r.correct && (
                      <p className="text-red-400 text-xs mt-1 ml-5">
                        {r.given ? `You said: ${r.given}` : r.verdict === 'nobuzz' ? 'No buzz' : "Time's up"}
                      </p>
                    )}
                    {r.overridden && <p className="text-xs text-gray-500 mt-1 ml-5">Marked correct (you said: {r.given})</p>}
                    <details className="ml-5 mt-1">
                      <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">Question</summary>
                      <p className="text-xs text-gray-400 mt-1">{r.tossup.question}</p>
                    </details>
                  </>
                ) : (
                  <p className="text-xs text-amber-400">Unplayed bonus</p>
                )}
                {r.bonus && <BonusSummary bonus={r.bonus} />}
              </div>
            ))}
          </div>
        </div>

        {footer && <div className="flex flex-wrap justify-center gap-3">{footer}</div>}
      </div>
    )
  }

  // ─── Leftover bonuses ───
  if (stage === 'leftover' || stage === 'leftoverBonus') {
    const unplayed = bonuses.length - (stage === 'leftover' ? usedBonuses.length : 0)
    return (
      <div>
        {stage === 'leftover' ? (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 text-center">
            <p className="text-gray-300 mb-1">
              That&apos;s all {tossups.length} tossups.
            </p>
            <p className="text-sm text-gray-500 mb-5">
              {unplayed} bonus {unplayed === 1 ? 'set was' : 'sets were'} never reached. Play {unplayed === 1 ? 'it' : 'them'} now?
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={startLeftovers}
                className="px-6 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-500 transition-colors"
              >
                Play Remaining Bonuses (Enter)
              </button>
              <button
                onClick={() => setStage('done')}
                className="px-6 py-2 bg-gray-700 text-gray-300 rounded-lg font-medium hover:bg-gray-600 transition-colors"
              >
                See Results
              </button>
            </div>
          </div>
        ) : (
          <BonusPlayer
            key={activeBonus}
            set={bonuses[activeBonus]}
            label={`Remaining bonus ${bonuses.length - leftoverQueue.length + 1} of ${bonuses.length}`}
            onDone={finishLeftover}
          />
        )}
      </div>
    )
  }

  // ─── Playing ───
  const running = summarize(current && (stage === 'result' || stage === 'bonus')
    ? [...results, { tossup, ...current, correct: isCorrect }]
    : results)

  return (
    <div>
      <div className="flex items-center justify-between mb-4 text-sm text-gray-500">
        <div>
          <span className="text-emerald-400 font-medium">{running.correct} correct</span>
          <span className="mx-1">&middot;</span>
          <span>Question {index + 1} of {tossups.length}</span>
        </div>
        <div className="flex items-center gap-3">
          <span>{running.points} pts</span>
          {(stage === 'ready' || stage === 'result') && (results.length > 0 || current) && (
            <button
              onClick={finishEarly}
              className="px-3 py-1 text-xs bg-gray-700 text-gray-400 rounded font-medium hover:bg-gray-600 transition-colors"
            >
              Finish Round
            </button>
          )}
        </div>
      </div>

      {/* Question */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6 min-h-[120px]">
        {stage === 'ready' ? (
          <div className="text-center">
            <button
              onClick={start}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-500 transition-colors"
            >
              Start Question (Enter)
            </button>
          </div>
        ) : stage === 'reading' || stage === 'answering' ? (
          <p className="text-lg leading-relaxed">
            {words.slice(0, revealed).join(' ')}
            {stage === 'reading' && !fullyRevealed && (
              <span className="inline-block w-2 h-5 bg-indigo-500 ml-1 animate-pulse" />
            )}
          </p>
        ) : (
          <p className="text-gray-400 leading-relaxed">{tossup.question}</p>
        )}
      </div>

      {/* Buzz */}
      {stage === 'reading' && (
        <div className="flex flex-wrap justify-center items-center gap-4 mb-6">
          <button
            onClick={buzz}
            className="px-8 py-3 bg-red-600 text-white rounded-lg font-bold text-lg hover:bg-red-500 transition-colors"
          >
            BUZZ (Enter)
          </button>
          {buzzLeft !== null && (
            <>
              <div className={`text-lg font-mono font-bold ${buzzLeft <= 2 ? 'text-red-400 animate-pulse' : 'text-gray-400'}`}>
                {buzzLeft}s
              </div>
              <button
                onClick={() => resolve('nobuzz')}
                className="px-4 py-2 bg-gray-700 text-gray-400 rounded-lg font-medium hover:bg-gray-600 transition-colors text-sm"
              >
                Show Answer
              </button>
            </>
          )}
        </div>
      )}

      {/* Answer */}
      {stage === 'answering' && (
        <div className="mb-6">
          {prompted && <PromptNote />}
          <form onSubmit={e => { e.preventDefault(); submit() }} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={given}
              onChange={e => setGiven(e.target.value)}
              placeholder="Type your answer..."
              className="flex-1 min-w-0 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoComplete="off"
            />
            <button
              type="submit"
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-500 transition-colors"
            >
              Submit
            </button>
            <Timer left={answerLeft} />
          </form>
        </div>
      )}

      {/* Result */}
      {(stage === 'result' || stage === 'bonus') && (
        <div className="mb-6">
          <div className={`rounded-lg p-4 mb-4 border ${
            isCorrect
              ? 'bg-emerald-500/10 border-emerald-500/30'
              : current.verdict === 'close'
                ? 'bg-amber-500/10 border-amber-500/30'
                : 'bg-red-500/10 border-red-500/30'
          }`}>
            <p className={`font-semibold ${
              isCorrect ? 'text-emerald-400' : current.verdict === 'close' ? 'text-amber-400' : 'text-red-400'
            }`}>
              {current.overridden
                ? `Marked correct +${TOSSUP_POINTS}`
                : isCorrect ? `Correct! +${TOSSUP_POINTS} points` : VERDICT_TEXT[current.verdict]}
            </p>
            <p className="text-sm mt-1">
              <span className="text-gray-500">Answer: </span>
              <AnswerText answer={tossup.answer} />
              <span className="text-xs text-gray-600 ml-2">{tossup.category}</span>
            </p>
            {!isCorrect && current.given && (
              <p className="text-sm mt-1">
                <span className="text-gray-500">You said: </span>
                <span className="text-gray-400">{current.given}</span>
              </p>
            )}
            {current.bonus && <BonusSummary bonus={current.bonus} />}
          </div>

          {stage === 'bonus' ? (
            <BonusPlayer key={activeBonus} set={bonuses[activeBonus]} onDone={finishBonus} />
          ) : (
            <div className="flex flex-wrap justify-center gap-3">
              {canBonus ? (
                <>
                  <button
                    onClick={startBonus}
                    className="px-6 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-500 transition-colors"
                  >
                    Start Bonus (Enter)
                  </button>
                  <button
                    onClick={next}
                    className="px-6 py-2 bg-gray-700 text-gray-300 rounded-lg font-medium hover:bg-gray-600 transition-colors"
                  >
                    Skip Bonus
                  </button>
                </>
              ) : (
                <button
                  onClick={next}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-500 transition-colors"
                >
                  {isLast ? 'Finish' : 'Next Question'} (Enter)
                </button>
              )}
              {!isCorrect && current.given && (
                <button
                  onClick={() => setCurrent(c => ({ ...c, overridden: true }))}
                  className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors"
                >
                  I was right
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
