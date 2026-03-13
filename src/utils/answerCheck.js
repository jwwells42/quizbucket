const normalize = s => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
const stripArticles = s => s.replace(/^(the|a|an) /, '')

function getAcceptables(correctAnswer) {
  const results = new Set()
  for (const part of correctAnswer.split('/')) {
    const main = part.replace(/\(.*?\)/g, '').trim()
    const parens = [...part.matchAll(/\((.+?)\)/g)].map(m => m[1].trim())
    const n = stripArticles(normalize(main))
    if (n) results.add(n)
    for (const p of parens) {
      const pn = stripArticles(normalize(p))
      if (pn) results.add(pn)
    }
  }
  const full = stripArticles(normalize(correctAnswer))
  if (full) results.add(full)
  return results
}

function isOrderedSubsequence(shorter, longer) {
  let si = 0
  for (let i = 0; i < longer.length && si < shorter.length; i++) {
    if (shorter[si] === longer[i]) si++
  }
  return si === shorter.length
}

export function checkAnswer(correctAnswer, givenAnswer) {
  const g = stripArticles(normalize(givenAnswer))
  if (!g || g.length < 2) return false

  const acceptables = getAcceptables(correctAnswer)

  for (const a of acceptables) {
    if (a === g) return true
    if (g.length >= 3) {
      const aWords = a.split(' ')
      const gWords = g.split(' ')
      // Last-word matching: "Washington" matches "George Washington"
      // Must cover at least half the words to avoid matching just a name fragment
      if (gWords.length < aWords.length && gWords.length >= Math.ceil(aWords.length / 2)
        && aWords.slice(-gWords.length).join(' ') === g) return true
      if (aWords.length < gWords.length && aWords.length >= Math.ceil(gWords.length / 2)
        && gWords.slice(-aWords.length).join(' ') === a) return true
      // Subsequence matching: accept dropped middle names, prepositions, etc.
      // Student's words must appear in order, covering at least 60% of the answer
      if (aWords.length >= 3 && gWords.length >= 2 && gWords.length >= Math.ceil(aWords.length * 0.6)
        && isOrderedSubsequence(gWords, aWords)) return true
      if (gWords.length >= 3 && aWords.length >= 2 && aWords.length >= Math.ceil(gWords.length * 0.6)
        && isOrderedSubsequence(aWords, gWords)) return true
    }
  }

  return false
}

function levenshtein(a, b) {
  const m = a.length, n = b.length
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
  return dp[m][n]
}

export function isCloseAnswer(correctAnswer, givenAnswer) {
  const g = stripArticles(normalize(givenAnswer))
  if (!g || g.length < 3) return false
  for (const a of getAcceptables(correctAnswer)) {
    if (a.length < 3) continue
    const dist = levenshtein(a, g)
    const maxLen = Math.max(a.length, g.length)
    if (dist > 0 && dist <= 2 && dist / maxLen <= 0.3) return true
  }
  return false
}
