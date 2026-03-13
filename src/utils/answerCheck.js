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

export function checkAnswer(correctAnswer, givenAnswer) {
  const g = stripArticles(normalize(givenAnswer))
  if (!g || g.length < 2) return false

  const acceptables = getAcceptables(correctAnswer)

  for (const a of acceptables) {
    if (a === g) return true
    // Last-word matching: "Washington" matches "George Washington"
    if (g.length >= 3) {
      const aWords = a.split(' ')
      const gWords = g.split(' ')
      if (gWords.length < aWords.length && aWords.slice(-gWords.length).join(' ') === g) return true
      if (aWords.length < gWords.length && gWords.slice(-aWords.length).join(' ') === a) return true
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
