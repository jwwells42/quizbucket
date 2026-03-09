import { useState, useRef, useMemo, useCallback, useEffect } from 'react'
import texts from '../data/texts.json'

const LEVELS = [
  { label: 'Level 1 — Full Text', removePct: 0 },
  { label: 'Level 2 — Some Missing', removePct: 0.3 },
  { label: 'Level 3 — Most Missing', removePct: 0.6 },
  { label: 'Level 4 — Blank', removePct: 1 },
]

function buildMaskedWords(text, removePct, seed) {
  const words = text.split(/\s+/)
  let rng = seed
  function nextRand() {
    rng = (rng * 16807 + 0) % 2147483647
    return rng / 2147483647
  }

  return words.map((word, i) => {
    if (i === 0 && removePct < 1) return { word, hidden: false }
    const hidden = removePct >= 1 ? true : nextRand() < removePct
    return { word, hidden }
  })
}

function normalize(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export default function Memorize() {
  const [phase, setPhase] = useState('select') // select | study | check
  const [selectedText, setSelectedText] = useState(null)
  const [level, setLevel] = useState(0)
  const [seed] = useState(() => Math.floor(Math.random() * 100000) + 1)
  // For levels 2-3: one value per hidden blank
  const [blankValues, setBlankValues] = useState({})
  // For level 4: full textarea
  const [userInput, setUserInput] = useState('')
  const [checkResult, setCheckResult] = useState(null)
  const blankRefs = useRef({})
  const textareaRef = useRef(null)

  const textData = texts.find(t => t.id === selectedText)

  const maskedWords = useMemo(() => {
    if (!textData) return []
    return buildMaskedWords(textData.text, LEVELS[level].removePct, seed + level)
  }, [textData, level, seed])

  // Ordered list of blank indices for tab-through
  const blankIndices = useMemo(() => {
    return maskedWords.reduce((acc, item, i) => {
      if (item.hidden) acc.push(i)
      return acc
    }, [])
  }, [maskedWords])

  // Auto-focus first blank on level change (levels 2-3)
  useEffect(() => {
    if (phase === 'study' && level >= 1 && level <= 2 && blankIndices.length > 0) {
      setTimeout(() => {
        blankRefs.current[blankIndices[0]]?.focus()
      }, 50)
    }
  }, [phase, level, blankIndices])

  const handleSelectText = useCallback((id) => {
    setSelectedText(id)
    setLevel(0)
    setPhase('study')
    setBlankValues({})
    setUserInput('')
    setCheckResult(null)
  }, [])

  const handleLevelChange = useCallback((newLevel) => {
    setLevel(newLevel)
    setBlankValues({})
    setUserInput('')
    setCheckResult(null)
    setPhase('study')
  }, [])

  const handleBlankChange = useCallback((index, value) => {
    setBlankValues(prev => ({ ...prev, [index]: value }))
  }, [])

  const handleBlankKeyDown = useCallback((e, index) => {
    const pos = blankIndices.indexOf(index)
    if (e.key === ' ' || e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      // Move to next blank
      if (pos < blankIndices.length - 1) {
        blankRefs.current[blankIndices[pos + 1]]?.focus()
      }
    }
  }, [blankIndices])

  const handleCheckBlanks = useCallback(() => {
    const hiddenWords = maskedWords.filter(item => item.hidden)
    let correctCount = 0
    const results = maskedWords.map((item, i) => {
      if (!item.hidden) return { word: item.word, hidden: false, match: true }
      const got = (blankValues[i] || '').trim()
      const match = normalize(got) === normalize(item.word)
      if (match) correctCount++
      return { word: item.word, hidden: true, got, match }
    })
    setCheckResult({ results, correctCount, totalBlanks: hiddenWords.length })
    setPhase('check')
  }, [maskedWords, blankValues])

  const handleCheckFull = useCallback(() => {
    if (!textData) return
    const original = textData.text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/)
    const attempt = userInput.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean)

    const maxLen = Math.max(original.length, attempt.length)
    const results = []
    let correctCount = 0
    for (let i = 0; i < maxLen; i++) {
      const expected = original[i] || ''
      const got = attempt[i] || ''
      const match = expected === got
      if (match) correctCount++
      results.push({ expected, got, match })
    }
    setCheckResult({ results, correctCount, totalWords: original.length, fullText: true })
    setPhase('check')
  }, [textData, userInput])

  const handleReset = useCallback(() => {
    setPhase('select')
    setSelectedText(null)
    setLevel(0)
    setBlankValues({})
    setUserInput('')
    setCheckResult(null)
  }, [])

  // Check if any blanks are filled (for enabling Check button)
  const hasAnyBlankFilled = Object.values(blankValues).some(v => v.trim())

  // --- SELECT PHASE ---
  if (phase === 'select') {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Text Memorizer</h1>
        <p className="text-gray-400 mb-6">
          Choose a text to memorize. Words are progressively removed across four levels until you can recite it from memory.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {texts.map(t => (
            <button
              key={t.id}
              onClick={() => handleSelectText(t.id)}
              className="text-left rounded-lg bg-gray-900 border border-gray-800 hover:border-purple-500 transition-colors p-5"
            >
              <h2 className="text-lg font-semibold mb-1">{t.title}</h2>
              <p className="text-sm text-gray-500">
                {t.text.split(/\s+/).length} words
              </p>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // --- STUDY & CHECK PHASES ---
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{textData.title}</h1>
          <p className="text-sm text-gray-500 mt-1">{LEVELS[level].label}</p>
        </div>
        <button
          onClick={handleReset}
          className="text-sm text-gray-400 hover:text-gray-200 transition-colors"
        >
          Change text
        </button>
      </div>

      {/* Level selector */}
      <div className="flex gap-2 mb-6">
        {LEVELS.map((l, i) => (
          <button
            key={i}
            onClick={() => handleLevelChange(i)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              level === i
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {/* Level 1: read-only full text */}
      {level === 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
          <p className="text-lg leading-relaxed">{textData.text}</p>
        </div>
      )}

      {/* Levels 2-3: inline blanks */}
      {(level === 1 || level === 2) && phase === 'study' && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
          <p className="text-lg leading-loose">
            {maskedWords.map((item, i) => (
              <span key={i}>
                {item.hidden ? (
                  <input
                    ref={el => { blankRefs.current[i] = el }}
                    type="text"
                    value={blankValues[i] || ''}
                    onChange={e => handleBlankChange(i, e.target.value)}
                    onKeyDown={e => handleBlankKeyDown(e, i)}
                    className="inline-block bg-gray-800 border-b-2 border-gray-600 focus:border-purple-500 rounded-sm px-1 mx-0.5 text-center text-gray-100 outline-none transition-colors"
                    style={{ width: `${Math.max(item.word.length, 3) * 0.7 + 1}em` }}
                    autoComplete="off"
                  />
                ) : (
                  <span>{item.word}</span>
                )}
                {' '}
              </span>
            ))}
          </p>
          <div className="flex justify-end mt-4">
            <button
              onClick={handleCheckBlanks}
              disabled={!hasAnyBlankFilled}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-medium transition-colors"
            >
              Check
            </button>
          </div>
        </div>
      )}

      {/* Levels 2-3: check results (inline) */}
      {(level === 1 || level === 2) && phase === 'check' && checkResult && !checkResult.fullText && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              {checkResult.correctCount}/{checkResult.totalBlanks} blanks correct
            </h2>
            <span className="text-2xl font-bold text-purple-400">
              {Math.round((checkResult.correctCount / checkResult.totalBlanks) * 100)}%
            </span>
          </div>
          <p className="text-lg leading-loose">
            {checkResult.results.map((r, i) => (
              <span key={i}>
                {!r.hidden ? (
                  <span>{r.word}</span>
                ) : r.match ? (
                  <span className="text-emerald-400 font-medium">{r.word}</span>
                ) : (
                  <span className="relative">
                    {r.got ? (
                      <span className="bg-red-900/50 text-red-300 rounded px-0.5 line-through">{r.got}</span>
                    ) : null}
                    <span className="text-emerald-400 font-medium">{r.got ? ' ' : ''}{r.word}</span>
                  </span>
                )}
                {' '}
              </span>
            ))}
          </p>
          <div className="flex justify-end mt-4">
            <button
              onClick={() => { setPhase('study'); setBlankValues({}); setCheckResult(null) }}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Level 4: full textarea */}
      {level === 3 && phase === 'study' && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
          <p className="text-gray-500 italic mb-4">
            Recite the full text from memory.
          </p>
          <textarea
            ref={textareaRef}
            value={userInput}
            onChange={e => setUserInput(e.target.value)}
            rows={8}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 focus:outline-none focus:border-purple-500 resize-y"
            placeholder="Type the text from memory..."
            autoFocus
          />
          <div className="flex justify-end mt-4">
            <button
              onClick={handleCheckFull}
              disabled={!userInput.trim()}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-medium transition-colors"
            >
              Check
            </button>
          </div>
        </div>
      )}

      {/* Level 4: check results (full text) */}
      {level === 3 && phase === 'check' && checkResult && checkResult.fullText && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              {checkResult.correctCount}/{checkResult.totalWords} words correct
            </h2>
            <span className="text-2xl font-bold text-purple-400">
              {Math.round((checkResult.correctCount / checkResult.totalWords) * 100)}%
            </span>
          </div>
          <div className="leading-relaxed">
            {checkResult.results.map((r, i) => (
              <span key={i}>
                {r.match ? (
                  <span className="text-emerald-400">{r.expected}</span>
                ) : r.got ? (
                  <span className="bg-red-900/50 text-red-300 rounded px-0.5" title={`Expected: ${r.expected}`}>
                    {r.got}
                  </span>
                ) : (
                  <span className="bg-red-900/50 text-red-300 rounded px-0.5">
                    [{r.expected}]
                  </span>
                )}
                {' '}
              </span>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-800">
            <p className="text-sm text-gray-500 mb-3">Original text:</p>
            <p className="text-sm text-gray-400 leading-relaxed">{textData.text}</p>
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={() => { setPhase('study'); setUserInput(''); setCheckResult(null) }}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Hint for level 1 */}
      {level === 0 && (
        <p className="text-sm text-gray-600 text-center">
          Read through the text, then move to the next level when you feel ready.
        </p>
      )}
    </div>
  )
}
