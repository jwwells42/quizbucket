import { checkAnswer, isCloseAnswer, normalize, stripArticles } from './answerCheck'

// Judges answers for the JH packet bank, where each answer is
// { display, accept: [...], prompt?: [...], reject?: [...] } (built by scripts/build-jh.mjs).
// Returns 'correct' | 'prompt' | 'close' | 'incorrect'.

const FRACTIONS = { '½': '1/2', '⅓': '1/3', '⅔': '2/3', '¼': '1/4', '¾': '3/4', '⅕': '1/5', '⅙': '1/6', '⅚': '5/6', '⅛': '1/8' }
const fractionChars = s => s.replace(/[½⅓⅔¼¾⅕⅙⅚⅛]/g, c => FRACTIONS[c])

// Spell out math notation the shared normalizer would otherwise strip,
// so "1/17" ≠ "117", "-12" ≠ "12", "3.5" ≠ "35", and "219π" = "219 pi"
function prep(s) {
  return fractionChars(s)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/π/g, ' pi ')
    .replace(/√|\bsquare root of\b|\bsqrt\b/gi, ' root ')
    .replace(/(\d)\s*\/\s*(\d)/g, '$1 over $2')
    .replace(/(\d)\.(\d)/g, '$1 point $2')
    .replace(/(^|[^\w])[-−–]\s*(?=\d)/g, '$1 negative ')
    .replace(/=/g, ' equals ')
    .replace(/[-–—]/g, ' ')
}

const norm = s => stripArticles(normalize(prep(s)))

// Plural/singular tolerance: "trench" = "trenches", "pixel" = "pixels"
function samePhrase(a, b) {
  if (a === b) return true
  const aw = a.split(' ')
  const bw = b.split(' ')
  return aw.length === bw.length && aw.every((w, i) =>
    w === bw[i] || w + 's' === bw[i] || bw[i] + 's' === w || w + 'es' === bw[i] || bw[i] + 'es' === w)
}

// Numeric answers: "132 pencils" accepts "132"; "1/15" accepts "5/75"; but
// "219 pi cubic feet" doesn't accept "219"
const MATH_WORDS = /\b(pi|root|sqrt|i|e|x|y|squared|cubed|over|power)\b|[π√^]/i
function parseNumber(s) {
  const m = fractionChars(s).replace(/[$,]/g, '').trim()
    .match(/^(negative\s+|[-−])?(\d+(?:\.\d+)?)(?:\s*(?:\/|over)\s*(\d+(?:\.\d+)?))?\s*(?:%|percent)?\s*(.*)$/i)
  if (!m) return null
  const value = (m[1] ? -1 : 1) * Number(m[2]) / (m[3] ? Number(m[3]) : 1)
  return { value, rest: m[4].trim() }
}

function numericMatch(accepted, given) {
  const a = parseNumber(accepted)
  const g = parseNumber(given)
  if (!a || !g || Math.abs(a.value - g.value) > 1e-9) return false
  if (!g.rest) return !MATH_WORDS.test(a.rest)
  if (!a.rest) return !MATH_WORDS.test(g.rest)
  return samePhrase(norm(a.rest), norm(g.rest))
}

const startsWithNumber = s => /^\s*[-−$]?[\d½⅓⅔¼¾⅕⅙⅚⅛]/.test(s)

const exactMatch = (candidate, g) => {
  const c = norm(candidate)
  return !!c && samePhrase(c, g)
}

function fuzzyMatch(candidate, given) {
  if (startsWithNumber(candidate)) return numericMatch(candidate, given)
  return checkAnswer(prep(candidate), prep(given))
}

export function judgeAnswer(answer, given) {
  const g = norm(given)
  if (!g) return 'incorrect'
  const prompts = answer.prompt || []
  if ((answer.reject || []).some(r => norm(r) === g)) return 'incorrect'
  // Exact matches first, so a listed prompt beats a loose match on a longer accept
  if (answer.accept.some(a => exactMatch(a, g))) return 'correct'
  if (prompts.some(p => exactMatch(p, g))) return 'prompt'
  if (answer.accept.some(a => fuzzyMatch(a, given))) return 'correct'
  if (prompts.some(p => fuzzyMatch(p, given))) return 'prompt'
  if (answer.accept.some(a => !startsWithNumber(a) && isCloseAnswer(prep(a), prep(given)))) return 'close'
  return 'incorrect'
}
