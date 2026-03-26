import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { sequences } from '../data/loader'
import { useProgress } from '../hooks/useProgress'
import { useLevel } from '../context/LevelContext'
import { useCustomContent } from '../hooks/useCustomContent'
import { checkAnswer } from '../utils/answerCheck'

const DRILL_TYPES = [
  { id: 'learn', label: 'Learn', description: 'Build up the sequence chunk by chunk' },
  { id: 'fill', label: 'Fill the Gap', description: 'Fill in missing items in the sequence' },
  { id: 'neighbor', label: 'Next & Before', description: 'Name what comes next or before' },
  { id: 'position', label: 'Position Quiz', description: 'Match items to their position number' },
  { id: 'recite', label: 'Full Recitation', description: 'Type the entire sequence from memory' },
]

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function flatItems(seq) {
  return seq.chunks.flatMap(c => c.items)
}

// --- LEARN DRILL ---
function LearnDrill({ sequence, onComplete }) {
  const allItems = useMemo(() => flatItems(sequence), [sequence])
  const [chunkIndex, setChunkIndex] = useState(0)
  const [buildUp, setBuildUp] = useState([]) // items revealed so far in current chunk
  const [phase, setPhase] = useState('show') // show | quiz | chunk-done
  const [quizIndex, setQuizIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState(null) // null | 'correct' | 'incorrect'
  const [incorrectAnswer, setIncorrectAnswer] = useState(null)
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const inputRef = useRef(null)

  const chunk = sequence.chunks[chunkIndex]
  const globalOffset = useMemo(() => {
    let offset = 0
    for (let i = 0; i < chunkIndex; i++) offset += sequence.chunks[i].items.length
    return offset
  }, [chunkIndex, sequence])

  // Start: show first 3 items (or full chunk if <=3)
  useEffect(() => {
    if (chunk) {
      const initial = chunk.items.slice(0, Math.min(3, chunk.items.length))
      setBuildUp(initial)
      setPhase(chunk.items.length <= 3 ? 'quiz' : 'show')
      setQuizIndex(0)
      setAnswer('')
      setFeedback(null)
      setIncorrectAnswer(null)
    }
  }, [chunkIndex, chunk])

  // Auto-focus input in quiz phase
  useEffect(() => {
    if (phase === 'quiz') setTimeout(() => inputRef.current?.focus(), 50)
  }, [phase, quizIndex])

  const handleAddMore = () => {
    const nextBatch = chunk.items.slice(buildUp.length, buildUp.length + 2)
    const newBuild = [...buildUp, ...nextBatch]
    setBuildUp(newBuild)
    if (newBuild.length >= chunk.items.length) {
      setPhase('quiz')
      setQuizIndex(0)
    }
  }

  const handleQuizSubmit = (e) => {
    e.preventDefault()
    if (feedback) return
    const expected = chunk.items[quizIndex]
    const correct = checkAnswer(expected, answer)
    setScore(s => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }))
    if (correct) {
      setFeedback('correct')
      setTimeout(() => {
        setFeedback(null)
        setIncorrectAnswer(null)
        setAnswer('')
        if (quizIndex + 1 >= chunk.items.length) {
          setPhase('chunk-done')
        } else {
          setQuizIndex(i => i + 1)
        }
      }, 500)
    } else {
      setFeedback('incorrect')
      setIncorrectAnswer(expected)
    }
  }

  const handleNextAfterIncorrect = () => {
    setFeedback(null)
    setIncorrectAnswer(null)
    setAnswer('')
    if (quizIndex + 1 >= chunk.items.length) {
      setPhase('chunk-done')
    } else {
      setQuizIndex(i => i + 1)
    }
  }

  const handleNextChunk = () => {
    if (chunkIndex + 1 >= sequence.chunks.length) {
      onComplete(score.correct, score.total)
    } else {
      setChunkIndex(i => i + 1)
    }
  }

  if (!chunk) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-rose-300">{chunk.label}</h2>
        <span className="text-sm text-gray-500">Chunk {chunkIndex + 1}/{sequence.chunks.length}</span>
      </div>

      {/* Show phase: display items built up so far */}
      {phase === 'show' && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-4">
          <p className="text-sm text-gray-500 mb-4">Study these items in order, then we'll add more:</p>
          <ol start={globalOffset + 1} className="space-y-2">
            {buildUp.map((item, i) => (
              <li key={i} className="flex gap-3 items-baseline">
                <span className="text-rose-400 font-mono text-sm w-8 text-right shrink-0">{globalOffset + i + 1}.</span>
                <span className="text-lg">{item}</span>
              </li>
            ))}
          </ol>
          <div className="flex justify-end mt-6">
            {buildUp.length < chunk.items.length ? (
              <button
                onClick={handleAddMore}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium transition-colors"
              >
                Add More
              </button>
            ) : (
              <button
                onClick={() => { setPhase('quiz'); setQuizIndex(0) }}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium transition-colors"
              >
                Quiz Me
              </button>
            )}
          </div>
        </div>
      )}

      {/* Quiz phase: type each item in order */}
      {phase === 'quiz' && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-4">
          <p className="text-sm text-gray-500 mb-4">
            Now type item #{globalOffset + quizIndex + 1} in the sequence:
          </p>
          {/* Show previously answered items */}
          {quizIndex > 0 && (
            <ol start={globalOffset + 1} className="space-y-1 mb-4 text-gray-500">
              {chunk.items.slice(0, quizIndex).map((item, i) => (
                <li key={i} className="flex gap-3 items-baseline">
                  <span className="font-mono text-sm w-8 text-right shrink-0">{globalOffset + i + 1}.</span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          )}
          <div className={`flex gap-3 items-baseline p-3 rounded-lg transition-colors ${
            feedback === 'correct' ? 'bg-emerald-500/10' : feedback === 'incorrect' ? 'bg-red-500/10' : 'bg-gray-800'
          }`}>
            <span className="text-rose-400 font-mono text-sm w-8 text-right shrink-0">{globalOffset + quizIndex + 1}.</span>
            <form onSubmit={handleQuizSubmit} className="flex-1 flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                disabled={feedback === 'correct'}
                placeholder="Type the next item..."
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-50"
                autoComplete="off"
              />
              {!feedback && (
                <button type="submit" className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded font-medium transition-colors">
                  Check
                </button>
              )}
            </form>
          </div>
          {feedback === 'incorrect' && (
            <div className="mt-3 flex items-center justify-between">
              <p className="text-red-400 text-sm">
                The answer is: <span className="font-semibold text-gray-200">{incorrectAnswer}</span>
              </p>
              <button
                onClick={handleNextAfterIncorrect}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-medium text-sm transition-colors"
              >
                Continue
              </button>
            </div>
          )}
        </div>
      )}

      {/* Chunk done */}
      {phase === 'chunk-done' && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-4 text-center">
          <p className="text-lg font-semibold text-emerald-400 mb-2">Chunk complete!</p>
          <ol start={globalOffset + 1} className="space-y-1 mb-4 text-left max-w-sm mx-auto">
            {chunk.items.map((item, i) => (
              <li key={i} className="flex gap-3 items-baseline">
                <span className="text-rose-400 font-mono text-sm w-8 text-right shrink-0">{globalOffset + i + 1}.</span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
          <button
            onClick={handleNextChunk}
            className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium transition-colors"
          >
            {chunkIndex + 1 >= sequence.chunks.length ? 'Finish' : 'Next Chunk'}
          </button>
        </div>
      )}
    </div>
  )
}

// --- FILL THE GAP DRILL ---
function FillDrill({ sequence, onComplete }) {
  const allItems = useMemo(() => flatItems(sequence), [sequence])
  const [blankedIndices, setBlankedIndices] = useState([])
  const [answers, setAnswers] = useState({})
  const [checked, setChecked] = useState(false)
  const [results, setResults] = useState(null)
  const blankRefs = useRef({})

  useEffect(() => {
    // Blank out ~40% of items, never the first
    const indices = []
    for (let i = 1; i < allItems.length; i++) {
      if (Math.random() < 0.4) indices.push(i)
    }
    if (indices.length === 0 && allItems.length > 1) indices.push(1)
    setBlankedIndices(indices)
    setAnswers({})
    setChecked(false)
    setResults(null)
  }, [allItems])

  useEffect(() => {
    if (blankedIndices.length > 0) {
      setTimeout(() => blankRefs.current[blankedIndices[0]]?.focus(), 50)
    }
  }, [blankedIndices])

  const handleKeyDown = (e, idx) => {
    const pos = blankedIndices.indexOf(idx)
    if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault()
      if (pos > 0) blankRefs.current[blankedIndices[pos - 1]]?.focus()
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      if (pos < blankedIndices.length - 1) {
        blankRefs.current[blankedIndices[pos + 1]]?.focus()
      }
    }
  }

  const handleCheck = () => {
    let correct = 0
    const res = allItems.map((item, i) => {
      if (!blankedIndices.includes(i)) return { item, blanked: false, correct: true }
      const given = (answers[i] || '').trim()
      const isCorrect = checkAnswer(item, given)
      if (isCorrect) correct++
      return { item, blanked: true, given, correct: isCorrect }
    })
    setResults(res)
    setChecked(true)
    onComplete(correct, blankedIndices.length)
  }

  let chunkStart = 0
  return (
    <div>
      {!checked ? (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-4">
          <p className="text-sm text-gray-500 mb-4">Fill in the blanked-out items:</p>
          {sequence.chunks.map((chunk, ci) => {
            const start = chunkStart
            chunkStart += chunk.items.length
            return (
              <div key={ci} className="mb-4">
                <p className="text-xs text-gray-600 font-medium mb-1">{chunk.label}</p>
                <ol start={start + 1} className="space-y-1.5">
                  {chunk.items.map((item, i) => {
                    const globalIdx = start + i
                    const isBlanked = blankedIndices.includes(globalIdx)
                    return (
                      <li key={i} className="flex gap-3 items-baseline">
                        <span className="text-rose-400 font-mono text-sm w-8 text-right shrink-0">{globalIdx + 1}.</span>
                        {isBlanked ? (
                          <input
                            ref={el => { blankRefs.current[globalIdx] = el }}
                            type="text"
                            value={answers[globalIdx] || ''}
                            onChange={e => setAnswers(prev => ({ ...prev, [globalIdx]: e.target.value }))}
                            onKeyDown={e => handleKeyDown(e, globalIdx)}
                            placeholder="???"
                            className="flex-1 max-w-xs px-2 py-1 bg-gray-800 border-b-2 border-gray-600 focus:border-rose-500 rounded-sm text-gray-100 placeholder-gray-600 outline-none transition-colors"
                            autoComplete="off"
                          />
                        ) : (
                          <span>{item}</span>
                        )}
                      </li>
                    )
                  })}
                </ol>
              </div>
            )
          })}
          <div className="flex justify-end mt-4">
            <button
              onClick={handleCheck}
              disabled={Object.keys(answers).length === 0}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-medium transition-colors"
            >
              Check
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-4">
          {(() => { chunkStart = 0; return null })()}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Results</h2>
            <span className="text-2xl font-bold text-rose-400">
              {results.filter(r => r.blanked && r.correct).length}/{blankedIndices.length}
            </span>
          </div>
          {sequence.chunks.map((chunk, ci) => {
            const start = chunkStart
            chunkStart += chunk.items.length
            return (
              <div key={ci} className="mb-4">
                <p className="text-xs text-gray-600 font-medium mb-1">{chunk.label}</p>
                <ol start={start + 1} className="space-y-1">
                  {chunk.items.map((_, i) => {
                    const r = results[start + i]
                    return (
                      <li key={i} className="flex gap-3 items-baseline">
                        <span className="text-rose-400 font-mono text-sm w-8 text-right shrink-0">{start + i + 1}.</span>
                        {!r.blanked ? (
                          <span>{r.item}</span>
                        ) : r.correct ? (
                          <span className="text-emerald-400 font-medium">{r.item}</span>
                        ) : (
                          <span>
                            {r.given && <span className="text-red-400 line-through mr-2">{r.given}</span>}
                            <span className="text-emerald-400 font-medium">{r.item}</span>
                          </span>
                        )}
                      </li>
                    )
                  })}
                </ol>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// --- NEIGHBOR DRILL (What Comes Next / Before) ---
function NeighborDrill({ sequence, onComplete }) {
  const allItems = useMemo(() => flatItems(sequence), [sequence])
  const ROUND_SIZE = Math.min(15, allItems.length - 1)

  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [correctAnswer, setCorrectAnswer] = useState(null)
  const [score, setScore] = useState(0)
  const inputRef = useRef(null)

  useEffect(() => {
    const qs = []
    for (let i = 0; i < allItems.length; i++) {
      if (i > 0) qs.push({ type: 'before', given: allItems[i], answer: allItems[i - 1], position: i + 1 })
      if (i < allItems.length - 1) qs.push({ type: 'next', given: allItems[i], answer: allItems[i + 1], position: i + 1 })
    }
    setQuestions(shuffle(qs).slice(0, ROUND_SIZE))
    setCurrentIndex(0)
    setAnswer('')
    setFeedback(null)
    setCorrectAnswer(null)
    setScore(0)
  }, [allItems, ROUND_SIZE])

  useEffect(() => {
    if (!feedback) setTimeout(() => inputRef.current?.focus(), 50)
  }, [currentIndex, feedback])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (feedback) return
    const q = questions[currentIndex]
    const isCorrect = checkAnswer(q.answer, answer)
    if (isCorrect) {
      setScore(s => s + 1)
      setFeedback('correct')
      setTimeout(advance, 500)
    } else {
      setFeedback('incorrect')
      setCorrectAnswer(q.answer)
    }
  }

  const advance = () => {
    setFeedback(null)
    setCorrectAnswer(null)
    setAnswer('')
    if (currentIndex + 1 >= questions.length) {
      const finalScore = score + (feedback === 'correct' ? 0 : 0) // score already updated
      onComplete(finalScore, questions.length)
    } else {
      setCurrentIndex(i => i + 1)
    }
  }

  // Need to handle the advance after score update for correct answers
  const handleContinue = () => {
    advance()
  }

  if (questions.length === 0) return null
  const q = questions[currentIndex]

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-500">
          Question {currentIndex + 1}/{questions.length}
        </span>
        <span className="text-sm text-emerald-400 font-medium">{score} correct</span>
      </div>

      <div className={`bg-gray-900 border rounded-lg p-6 mb-4 transition-colors ${
        feedback === 'correct' ? 'border-emerald-500' : feedback === 'incorrect' ? 'border-red-500' : 'border-gray-800'
      }`}>
        <p className="text-sm text-gray-500 mb-1">
          #{q.position} in the sequence:
        </p>
        <p className="text-xl font-semibold mb-4">{q.given}</p>
        <p className="text-gray-400">
          {q.type === 'next' ? 'What comes NEXT?' : 'What comes BEFORE?'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
        <input
          ref={inputRef}
          type="text"
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          disabled={!!feedback}
          placeholder="Type your answer..."
          className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500 text-lg disabled:opacity-50"
          autoComplete="off"
        />
        {!feedback && (
          <button type="submit" className="px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium transition-colors">
            Check
          </button>
        )}
      </form>

      {feedback === 'incorrect' && (
        <div className="flex items-center justify-between">
          <p className="text-red-400 text-sm">
            Answer: <span className="font-semibold text-gray-200">{correctAnswer}</span>
          </p>
          <button
            onClick={handleContinue}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-medium text-sm transition-colors"
          >
            Continue
          </button>
        </div>
      )}
    </div>
  )
}

// --- POSITION QUIZ DRILL ---
function PositionDrill({ sequence, onComplete }) {
  const allItems = useMemo(() => flatItems(sequence), [sequence])
  const ROUND_SIZE = Math.min(15, allItems.length)

  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [correctAnswer, setCorrectAnswer] = useState(null)
  const [score, setScore] = useState(0)
  const inputRef = useRef(null)

  useEffect(() => {
    const qs = []
    for (let i = 0; i < allItems.length; i++) {
      // Mix of "what is #N?" and "what number is X?"
      qs.push({ type: 'name', position: i + 1, item: allItems[i] })
      qs.push({ type: 'number', position: i + 1, item: allItems[i] })
    }
    setQuestions(shuffle(qs).slice(0, ROUND_SIZE))
    setCurrentIndex(0)
    setAnswer('')
    setFeedback(null)
    setCorrectAnswer(null)
    setScore(0)
  }, [allItems, ROUND_SIZE])

  useEffect(() => {
    if (!feedback) setTimeout(() => inputRef.current?.focus(), 50)
  }, [currentIndex, feedback])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (feedback) return
    const q = questions[currentIndex]
    let isCorrect = false
    let expected = ''
    if (q.type === 'name') {
      expected = q.item
      isCorrect = checkAnswer(q.item, answer)
    } else {
      expected = String(q.position)
      isCorrect = answer.trim() === expected
    }
    if (isCorrect) {
      setScore(s => s + 1)
      setFeedback('correct')
      setTimeout(advance, 500)
    } else {
      setFeedback('incorrect')
      setCorrectAnswer(expected)
    }
  }

  const advance = () => {
    setFeedback(null)
    setCorrectAnswer(null)
    setAnswer('')
    if (currentIndex + 1 >= questions.length) {
      onComplete(score, questions.length)
    } else {
      setCurrentIndex(i => i + 1)
    }
  }

  if (questions.length === 0) return null
  const q = questions[currentIndex]

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-500">
          Question {currentIndex + 1}/{questions.length}
        </span>
        <span className="text-sm text-emerald-400 font-medium">{score} correct</span>
      </div>

      <div className={`bg-gray-900 border rounded-lg p-6 mb-4 transition-colors ${
        feedback === 'correct' ? 'border-emerald-500' : feedback === 'incorrect' ? 'border-red-500' : 'border-gray-800'
      }`}>
        {q.type === 'name' ? (
          <p className="text-xl font-semibold">What is #{q.position} in the sequence?</p>
        ) : (
          <p className="text-xl font-semibold">What number is <span className="text-rose-300">{q.item}</span>?</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
        <input
          ref={inputRef}
          type="text"
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          disabled={!!feedback}
          placeholder={q.type === 'name' ? 'Type the name...' : 'Type the number...'}
          className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500 text-lg disabled:opacity-50"
          autoComplete="off"
        />
        {!feedback && (
          <button type="submit" className="px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium transition-colors">
            Check
          </button>
        )}
      </form>

      {feedback === 'incorrect' && (
        <div className="flex items-center justify-between">
          <p className="text-red-400 text-sm">
            Answer: <span className="font-semibold text-gray-200">{correctAnswer}</span>
          </p>
          <button
            onClick={advance}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-medium text-sm transition-colors"
          >
            Continue
          </button>
        </div>
      )}
    </div>
  )
}

// --- FULL RECITATION DRILL ---
function ReciteDrill({ sequence, onComplete }) {
  const allItems = useMemo(() => flatItems(sequence), [sequence])
  const [userInput, setUserInput] = useState('')
  const [checked, setChecked] = useState(false)
  const [results, setResults] = useState(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    setTimeout(() => textareaRef.current?.focus(), 50)
  }, [])

  const handleCheck = () => {
    const lines = userInput.split('\n').map(l => l.replace(/^\d+[\.\)\-\s]+/, '').trim()).filter(Boolean)
    const maxLen = Math.max(allItems.length, lines.length)
    let correct = 0
    const res = []
    for (let i = 0; i < maxLen; i++) {
      const expected = allItems[i] || null
      const given = lines[i] || null
      const isCorrect = expected && given && checkAnswer(expected, given)
      if (isCorrect) correct++
      res.push({ expected, given, correct: isCorrect })
    }
    setResults(res)
    setChecked(true)
    onComplete(correct, allItems.length)
  }

  if (!checked) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-4">
        <p className="text-sm text-gray-500 mb-4">
          Type the full sequence from memory, one item per line ({allItems.length} items total):
        </p>
        <textarea
          ref={textareaRef}
          value={userInput}
          onChange={e => setUserInput(e.target.value)}
          rows={Math.min(20, allItems.length + 2)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 focus:outline-none focus:border-rose-500 resize-y font-mono"
          placeholder={"1. First item\n2. Second item\n3. ..."}
        />
        <div className="flex justify-end mt-4">
          <button
            onClick={handleCheck}
            disabled={!userInput.trim()}
            className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-medium transition-colors"
          >
            Check
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Results</h2>
        <span className="text-2xl font-bold text-rose-400">
          {results.filter(r => r.correct).length}/{allItems.length}
        </span>
      </div>
      <ol className="space-y-1">
        {results.map((r, i) => (
          <li key={i} className="flex gap-3 items-baseline">
            <span className="text-rose-400 font-mono text-sm w-8 text-right shrink-0">{i + 1}.</span>
            {r.correct ? (
              <span className="text-emerald-400">{r.expected}</span>
            ) : (
              <span>
                {r.given && <span className="text-red-400 line-through mr-2">{r.given}</span>}
                {r.expected ? (
                  <span className="text-emerald-400">{r.expected}</span>
                ) : (
                  <span className="text-gray-600 italic">(extra)</span>
                )}
              </span>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}

// --- FULL LIST REFERENCE PANEL ---
function FullListPanel({ sequence, open, onToggle }) {
  let itemNum = 0
  return (
    <div className="mt-6">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
      >
        <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        {open ? 'Hide full list' : 'View full list'}
      </button>
      {open && (
        <div className="mt-3 bg-gray-900 border border-gray-800 rounded-lg p-6">
          {sequence.chunks.map((chunk, ci) => (
            <div key={ci} className={ci > 0 ? 'mt-4' : ''}>
              <p className="text-xs text-gray-600 font-medium mb-1">{chunk.label}</p>
              <ol start={itemNum + 1} className="space-y-0.5">
                {chunk.items.map((item, i) => {
                  itemNum++
                  return (
                    <li key={i} className="flex gap-3 items-baseline">
                      <span className="text-rose-400 font-mono text-sm w-8 text-right shrink-0">{itemNum}.</span>
                      <span className="text-gray-300">{item}</span>
                    </li>
                  )
                })}
              </ol>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// --- MAIN SEQUENCE PAGE ---
export default function Sequence() {
  const { filterByLevel } = useLevel()
  const { recordSequence, getSequenceStats } = useProgress()
  const { customSequences, addSequence, deleteSequence } = useCustomContent()
  const filteredSequences = filterByLevel(sequences)
  const allSequences = [...sequences, ...customSequences]
  const sequenceStats = getSequenceStats()

  const [searchParams, setSearchParams] = useSearchParams()
  const selectedId = searchParams.get('id')
  const drillType = searchParams.get('drill')

  const [drillKey, setDrillKey] = useState(0) // force remount on retry
  const [lastResult, setLastResult] = useState(null)
  const [showFullList, setShowFullList] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newItems, setNewItems] = useState('')
  const [newChunkSize, setNewChunkSize] = useState('5')

  const selectedSeq = allSequences.find(s => s.id === selectedId)

  const handleSelect = (id) => {
    setSearchParams({ id })
    setLastResult(null)
    setShowFullList(false)
  }

  const handleStartDrill = (type) => {
    setSearchParams({ id: selectedId, drill: type })
    setLastResult(null)
    setDrillKey(k => k + 1)
  }

  const handleComplete = useCallback((correct, total) => {
    setLastResult({ correct, total })
    if (selectedId && drillType) {
      recordSequence(selectedId, drillType, correct, total)
    }
  }, [selectedId, drillType, recordSequence])

  const handleBack = () => {
    if (lastResult || drillType) {
      setSearchParams({ id: selectedId })
      setLastResult(null)
    } else {
      setSearchParams({})
    }
  }

  // Clear drill result when navigating back via browser
  useEffect(() => {
    if (!drillType) setLastResult(null)
  }, [drillType])

  const handleCreateSequence = (e) => {
    e.preventDefault()
    const items = newItems.split('\n').map(l => l.replace(/^\d+[\.\)\-\s]+/, '').trim()).filter(Boolean)
    if (!newTitle.trim() || items.length < 2) return
    addSequence(newTitle.trim(), items, parseInt(newChunkSize) || 5)
    setNewTitle('')
    setNewItems('')
    setNewChunkSize('5')
    setShowCreateForm(false)
  }

  // --- SELECT SEQUENCE ---
  if (!selectedId) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-2">Sequence Memorizer</h1>
        <p className="text-gray-400 mb-6">
          Learn ordered lists through chunked build-up, gap-fill, neighbor drills, position quizzes, and full recitation.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {filteredSequences.map(seq => {
            const totalItems = flatItems(seq).length
            const stats = sequenceStats[seq.id]
            const drillsDone = stats ? Object.keys(stats).length : 0
            return (
              <button
                key={seq.id}
                onClick={() => handleSelect(seq.id)}
                className="text-left rounded-lg bg-gray-900 border border-gray-800 hover:border-rose-500 transition-colors p-5"
              >
                <h2 className="text-lg font-semibold mb-1">{seq.title}</h2>
                <p className="text-sm text-gray-500 mb-1">{seq.description}</p>
                <div className="flex gap-3 text-xs text-gray-600">
                  <span>{totalItems} items</span>
                  <span>{seq.chunks.length} chunks</span>
                  {drillsDone > 0 && <span className="text-rose-400">{drillsDone}/5 drills tried</span>}
                </div>
              </button>
            )
          })}
          {customSequences.map(seq => {
            const totalItems = flatItems(seq).length
            const stats = sequenceStats[seq.id]
            const drillsDone = stats ? Object.keys(stats).length : 0
            return (
              <div key={seq.id} className="relative group">
                <button
                  onClick={() => handleSelect(seq.id)}
                  className="w-full text-left rounded-lg bg-gray-900 border border-gray-800 hover:border-rose-500 transition-colors p-5"
                >
                  <h2 className="text-lg font-semibold mb-1">{seq.title}</h2>
                  <p className="text-sm text-gray-500 mb-1">{seq.description}</p>
                  <div className="flex gap-3 text-xs text-gray-600">
                    <span>{totalItems} items</span>
                    <span>{seq.chunks.length} chunks</span>
                    <span className="text-rose-400/60">Custom</span>
                    {drillsDone > 0 && <span className="text-rose-400">{drillsDone}/5 drills tried</span>}
                  </div>
                </button>
                <button
                  onClick={() => deleteSequence(seq.id)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all p-1"
                  title="Delete custom sequence"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )
          })}
        </div>

        {/* Create custom sequence */}
        <div className="mt-6">
          {!showCreateForm ? (
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-rose-400 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create your own sequence
            </button>
          ) : (
            <form onSubmit={handleCreateSequence} className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Create Custom Sequence</h3>
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-1">Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g., Roman Emperors"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-600 focus:outline-none focus:border-rose-500"
                  autoFocus
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-1">Items (one per line, in order)</label>
                <textarea
                  value={newItems}
                  onChange={e => setNewItems(e.target.value)}
                  rows={10}
                  placeholder={"Augustus\nTiberius\nCaligula\nClaudius\nNero\n..."}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-600 focus:outline-none focus:border-rose-500 resize-y font-mono"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-1">Chunk size (items per group)</label>
                <input
                  type="number"
                  min="2"
                  max="20"
                  value={newChunkSize}
                  onChange={e => setNewChunkSize(e.target.value)}
                  className="w-24 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:border-rose-500"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={!newTitle.trim() || newItems.split('\n').filter(l => l.trim()).length < 2}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-medium transition-colors"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-5 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    )
  }

  // --- SELECT DRILL TYPE ---
  if (!drillType) {
    const stats = sequenceStats[selectedId] || {}
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">{selectedSeq.title}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {flatItems(selectedSeq).length} items in {selectedSeq.chunks.length} chunks
            </p>
          </div>
          <button
            onClick={handleBack}
            className="text-sm text-gray-400 hover:text-gray-200 transition-colors"
          >
            Change sequence
          </button>
        </div>

        <p className="text-gray-400 mb-4">Choose a drill type (recommended order: top to bottom):</p>

        <div className="space-y-3">
          {DRILL_TYPES.map((dt, i) => {
            const stat = stats[dt.id]
            return (
              <button
                key={dt.id}
                onClick={() => handleStartDrill(dt.id)}
                className="w-full text-left rounded-lg bg-gray-900 border border-gray-800 hover:border-rose-500 transition-colors p-4 flex items-center gap-4"
              >
                <span className="text-rose-400 font-bold text-lg w-8 text-center">{i + 1}</span>
                <div className="flex-1">
                  <h3 className="font-semibold">{dt.label}</h3>
                  <p className="text-sm text-gray-500">{dt.description}</p>
                </div>
                {stat && (
                  <span className="text-xs text-gray-500">
                    Best: {stat.bestScore}/{stat.bestTotal}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <FullListPanel sequence={selectedSeq} open={showFullList} onToggle={() => setShowFullList(v => !v)} />
      </div>
    )
  }

  // --- ACTIVE DRILL ---
  const drillLabel = DRILL_TYPES.find(d => d.id === drillType)?.label

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{selectedSeq.title}</h1>
          <p className="text-sm text-gray-500 mt-1">{drillLabel}</p>
        </div>
        <button
          onClick={handleBack}
          className="text-sm text-gray-400 hover:text-gray-200 transition-colors"
        >
          Back to drills
        </button>
      </div>

      {drillType === 'learn' && <LearnDrill key={drillKey} sequence={selectedSeq} onComplete={handleComplete} />}
      {drillType === 'fill' && <FillDrill key={drillKey} sequence={selectedSeq} onComplete={handleComplete} />}
      {drillType === 'neighbor' && <NeighborDrill key={drillKey} sequence={selectedSeq} onComplete={handleComplete} />}
      {drillType === 'position' && <PositionDrill key={drillKey} sequence={selectedSeq} onComplete={handleComplete} />}
      {drillType === 'recite' && <ReciteDrill key={drillKey} sequence={selectedSeq} onComplete={handleComplete} />}

      {lastResult && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 text-center">
          <div className="text-4xl font-bold text-rose-400 mb-2">
            {lastResult.correct}/{lastResult.total}
          </div>
          <p className="text-gray-500 mb-4">
            {Math.round((lastResult.correct / lastResult.total) * 100)}% correct
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => handleStartDrill(drillType)}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={handleBack}
              className="px-5 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg font-medium transition-colors"
            >
              Other Drills
            </button>
          </div>
        </div>
      )}

      <FullListPanel sequence={selectedSeq} open={showFullList} onToggle={() => setShowFullList(v => !v)} />
    </div>
  )
}
