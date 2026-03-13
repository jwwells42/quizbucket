// Procedural math problem generator for AGQBA-style computation practice.
// Each generator returns { question: string, answer: number|string }

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b)
  while (b) { [a, b] = [b, a % b] }
  return a
}

function lcm(a, b) {
  return (a * b) / gcd(a, b)
}

function factorial(n) {
  let r = 1
  for (let i = 2; i <= n; i++) r *= i
  return r
}

// ─── Grade 3/4 generators ────────────────────────────────────────────

function add34() {
  const a = randInt(100, 9999), b = randInt(100, 9999)
  return { question: `${a} + ${b} = ?`, answer: a + b }
}

function subtract34() {
  let a = randInt(500, 9999), b = randInt(100, a)
  return { question: `${a} − ${b} = ?`, answer: a - b }
}

function multiply34() {
  const a = randInt(2, 12), b = randInt(2, 12)
  return { question: `${a} × ${b} = ?`, answer: a * b }
}

function divide34() {
  const b = randInt(2, 12), answer = randInt(2, 12)
  const a = b * answer
  return { question: `${a} ÷ ${b} = ?`, answer }
}

function divideWithRemainder34() {
  const b = randInt(2, 9), q = randInt(3, 15), r = randInt(1, b - 1)
  const a = b * q + r
  return { question: `${a} ÷ ${b} = ? (write as "Q R remainder", e.g. "5 R 2")`, answer: `${q} R ${r}` }
}

function fractionAddLike34() {
  const d = pick([2, 3, 4, 6, 8])
  let a = randInt(1, d - 1), b = randInt(1, d - 1)
  while (a + b > d) { b = randInt(1, d - a) }
  const sum = a + b
  const g = gcd(sum, d)
  return { question: `${a}/${d} + ${b}/${d} = ?`, answer: g === d ? `${sum / g}` : `${sum / g}/${d / g}` }
}

function multiplyByTens34() {
  const a = randInt(2, 9), b = randInt(1, 9) * 10
  return { question: `${a} × ${b} = ?`, answer: a * b }
}

function twoStep34() {
  const ops = ['+', '−', '×']
  const op1 = pick(ops), op2 = pick(ops)
  let a, b, c, answer
  // Keep numbers reasonable
  a = randInt(2, 12); b = randInt(2, 12); c = randInt(2, 12)
  // Calculate left to right (no order of operations at this level — use parentheses)
  let first
  if (op1 === '+') first = a + b
  else if (op1 === '−') { b = randInt(1, a); first = a - b }
  else first = a * b

  if (op2 === '+') answer = first + c
  else if (op2 === '−') { c = randInt(1, Math.min(first, 12)); answer = first - c }
  else { c = randInt(2, 9); answer = first * c }

  return { question: `(${a} ${op1} ${b}) ${op2} ${c} = ?`, answer }
}

function round34() {
  const n = randInt(100, 9999)
  const place = pick([10, 100])
  const rounded = Math.round(n / place) * place
  const placeName = place === 10 ? 'ten' : 'hundred'
  return { question: `Round ${n} to the nearest ${placeName}.`, answer: rounded }
}

// ─── Grade 5/6 generators ────────────────────────────────────────────

function multiDigitMultiply56() {
  const a = randInt(12, 99), b = randInt(12, 99)
  return { question: `${a} × ${b} = ?`, answer: a * b }
}

function longDivision56() {
  const b = randInt(12, 30), answer = randInt(10, 99)
  const a = b * answer
  return { question: `${a} ÷ ${b} = ?`, answer }
}

function decimalAdd56() {
  const a = (randInt(100, 9999) / 100).toFixed(2)
  const b = (randInt(100, 9999) / 100).toFixed(2)
  const answer = (parseFloat(a) + parseFloat(b)).toFixed(2)
  return { question: `${a} + ${b} = ?`, answer: parseFloat(answer) }
}

function decimalMultiply56() {
  const a = (randInt(10, 99) / 10).toFixed(1)
  const b = randInt(2, 9)
  const answer = parseFloat((parseFloat(a) * b).toFixed(1))
  return { question: `${a} × ${b} = ?`, answer }
}

function fractionAddUnlike56() {
  const denoms = [2, 3, 4, 5, 6, 8, 10]
  let d1 = pick(denoms), d2 = pick(denoms)
  while (d1 === d2) d2 = pick(denoms)
  const n1 = randInt(1, d1 - 1), n2 = randInt(1, d2 - 1)
  const cd = lcm(d1, d2)
  const num = n1 * (cd / d1) + n2 * (cd / d2)
  const g = gcd(num, cd)
  const sn = num / g, sd = cd / g
  if (sd === 1) return { question: `${n1}/${d1} + ${n2}/${d2} = ?`, answer: `${sn}` }
  if (sn > sd) {
    const whole = Math.floor(sn / sd), rem = sn % sd
    if (rem === 0) return { question: `${n1}/${d1} + ${n2}/${d2} = ?`, answer: `${whole}` }
    return { question: `${n1}/${d1} + ${n2}/${d2} = ?`, answer: `${whole} ${rem}/${sd}` }
  }
  return { question: `${n1}/${d1} + ${n2}/${d2} = ?`, answer: `${sn}/${sd}` }
}

function orderOfOps56() {
  // e.g. 3 + 4 × 5 or (2 + 3) × 4
  const type = randInt(0, 2)
  let question, answer
  if (type === 0) {
    const a = randInt(2, 10), b = randInt(2, 8), c = randInt(2, 8)
    question = `${a} + ${b} × ${c} = ?`
    answer = a + b * c
  } else if (type === 1) {
    const a = randInt(2, 8), b = randInt(2, 8), c = randInt(2, 6)
    question = `(${a} + ${b}) × ${c} = ?`
    answer = (a + b) * c
  } else {
    const a = randInt(2, 5), b = randInt(2, 4)
    question = `${a}² + ${b}² = ?`
    answer = a * a + b * b
  }
  return { question, answer }
}

function gcfLcm56() {
  const isGcf = Math.random() < 0.5
  const a = randInt(4, 36), b = randInt(4, 36)
  if (isGcf) {
    return { question: `What is the GCF of ${a} and ${b}?`, answer: gcd(a, b) }
  }
  return { question: `What is the LCM of ${a} and ${b}?`, answer: lcm(a, b) }
}

function percentOf56() {
  const pct = pick([10, 15, 20, 25, 30, 40, 50, 75])
  const base = pick([40, 50, 60, 80, 100, 120, 200, 250, 300])
  const answer = (pct / 100) * base
  return { question: `What is ${pct}% of ${base}?`, answer }
}

function area56() {
  const shape = randInt(0, 1)
  if (shape === 0) {
    const b = randInt(3, 15), h = randInt(3, 15)
    const answer = (b * h) / 2
    return { question: `What is the area of a triangle with base ${b} and height ${h}?`, answer }
  }
  const b = randInt(3, 12), h = randInt(3, 12)
  return { question: `What is the area of a parallelogram with base ${b} and height ${h}?`, answer: b * h }
}

function solveOneStep56() {
  const x = randInt(2, 20)
  const type = randInt(0, 2)
  if (type === 0) {
    const b = randInt(3, 30)
    return { question: `Solve for x: x + ${b} = ${x + b}`, answer: x }
  } else if (type === 1) {
    const b = randInt(2, 12)
    return { question: `Solve for x: ${b}x = ${b * x}`, answer: x }
  }
  const b = randInt(1, 20)
  return { question: `Solve for x: x − ${b} = ${x - b}`, answer: x }
}

// ─── Grade 7-9 generators ────────────────────────────────────────────

function integerOps79() {
  const a = randInt(-20, 20), b = randInt(-20, 20)
  const op = pick(['+', '−', '×'])
  let answer
  if (op === '+') answer = a + b
  else if (op === '−') answer = a - b
  else answer = a * b
  const bStr = b < 0 ? `(${b})` : `${b}`
  const aStr = a < 0 ? `(${a})` : `${a}`
  return { question: `${aStr} ${op} ${bStr} = ?`, answer }
}

function proportions79() {
  const a = randInt(2, 10), b = randInt(2, 10), c = randInt(2, 10)
  if (a === c || a === b) return proportions79() // avoid trivial cases like a/b = a/x
  const d = (b * c) / a
  if (!Number.isInteger(d) || d === c) return proportions79() // avoid x = c (same denominators)
  return { question: `Solve: ${a}/${b} = ${c}/x`, answer: d }
}

function exponentRules79() {
  const type = randInt(0, 2)
  if (type === 0) {
    const base = randInt(2, 7), exp = randInt(2, 4)
    return { question: `${base}${exp === 2 ? '²' : exp === 3 ? '³' : '⁴'} = ?`, answer: Math.pow(base, exp) }
  } else if (type === 1) {
    const b = randInt(8, 18) // √64 to √324 — smaller squares are 5/6 level
    return { question: `√${b * b} = ?`, answer: b }
  }
  const b = randInt(3, 8) // ∛27 to ∛512
  return { question: `∛${b * b * b} = ?`, answer: b }
}

function pythagorean79() {
  const triples = [[3,4,5],[5,12,13],[6,8,10],[7,24,25],[8,15,17],[9,12,15]]
  const [a, b, c] = pick(triples)
  const findHyp = Math.random() < 0.5
  if (findHyp) {
    return { question: `A right triangle has legs ${a} and ${b}. What is the hypotenuse?`, answer: c }
  }
  return { question: `A right triangle has a hypotenuse of ${c} and a leg of ${a}. What is the other leg?`, answer: b }
}

function circleCalc79() {
  const r = randInt(2, 12)
  const isArea = Math.random() < 0.5
  if (isArea) {
    const answer = parseFloat((Math.PI * r * r).toFixed(2))
    return { question: `What is the area of a circle with radius ${r}? (Round to nearest hundredth, use π ≈ 3.14)`, answer: parseFloat((3.14 * r * r).toFixed(2)) }
  }
  return { question: `What is the circumference of a circle with radius ${r}? (Round to nearest hundredth, use π ≈ 3.14)`, answer: parseFloat((2 * 3.14 * r).toFixed(2)) }
}

function multiStepEq79() {
  const x = randInt(-10, 10)
  const a = randInt(2, 8), b = randInt(-15, 15)
  const rhs = a * x + b
  const bStr = b >= 0 ? `+ ${b}` : `− ${Math.abs(b)}`
  return { question: `Solve for x: ${a}x ${bStr} = ${rhs}`, answer: x }
}

function slope79() {
  const x1 = randInt(-5, 5), y1 = randInt(-5, 5)
  const x2 = randInt(-5, 5), y2 = randInt(-5, 5)
  if (x1 === x2) return slope79()
  const rise = y2 - y1, run = x2 - x1
  const g = gcd(Math.abs(rise), Math.abs(run))
  const sn = rise / g, sd = run / g
  // Normalize sign to numerator
  const finalN = sd < 0 ? -sn : sn
  const finalD = sd < 0 ? -sd : sd
  const answer = finalD === 1 ? `${finalN}` : `${finalN}/${finalD}`
  return { question: `What is the slope of the line through (${x1}, ${y1}) and (${x2}, ${y2})?`, answer }
}

function volume79() {
  const shape = randInt(0, 1)
  if (shape === 0) {
    const r = randInt(2, 8), h = randInt(3, 12)
    const answer = parseFloat((3.14 * r * r * h).toFixed(2))
    return { question: `What is the volume of a cylinder with radius ${r} and height ${h}? (Use π ≈ 3.14)`, answer }
  }
  const r = randInt(2, 7)
  const answer = parseFloat(((4/3) * 3.14 * r * r * r).toFixed(2))
  return { question: `What is the volume of a sphere with radius ${r}? (Use π ≈ 3.14, round to hundredths)`, answer }
}

function sciNotation79() {
  const coeff = randInt(10, 99) / 10 // 1.0 to 9.9
  const exp = randInt(2, 7)
  const answer = coeff * Math.pow(10, exp)
  return { question: `Express in standard form: ${coeff} × 10^${exp}`, answer }
}

// ─── Grade 9-12 generators ───────────────────────────────────────────

function polyFactor912() {
  // (x + a)(x + b) = x² + (a+b)x + ab
  const a = randInt(-9, 9), b = randInt(-9, 9)
  if (a === 0 || b === 0) return polyFactor912()
  const mid = a + b, last = a * b
  const midStr = mid >= 0 ? `+ ${mid}` : `− ${Math.abs(mid)}`
  const lastStr = last >= 0 ? `+ ${last}` : `− ${Math.abs(last)}`
  // Ask for the roots
  const roots = [(-a), (-b)].sort((x, y) => x - y)
  return { question: `Find the roots of x² ${midStr}x ${lastStr} = 0 (answer as "a, b" with a < b)`, answer: `${roots[0]}, ${roots[1]}` }
}

function logarithm912() {
  const type = randInt(0, 2)
  if (type === 0) {
    const base = pick([2, 3, 5, 10])
    const exp = randInt(1, 4)
    const val = Math.pow(base, exp)
    return { question: `log_${base}(${val}) = ?`, answer: exp }
  } else if (type === 1) {
    const base = pick([2, 10])
    const a = randInt(1, 3), b = randInt(1, 3)
    const answer = a + b
    const va = Math.pow(base, a), vb = Math.pow(base, b)
    return { question: `log_${base}(${va} × ${vb}) = ?`, answer }
  }
  const base = pick([2, 10])
  const a = randInt(2, 5), b = randInt(1, a - 1)
  const va = Math.pow(base, a), vb = Math.pow(base, b)
  return { question: `log_${base}(${va}/${vb}) = ?`, answer: a - b }
}

function matrix912() {
  const type = randInt(0, 1)
  if (type === 0) {
    // Determinant of 2x2
    const a = randInt(-5, 5), b = randInt(-5, 5), c = randInt(-5, 5), d = randInt(-5, 5)
    const det = a * d - b * c
    return { question: `Find the determinant of the matrix [[${a}, ${b}], [${c}, ${d}]]`, answer: det }
  }
  // Matrix multiplication result element
  const a = randInt(1, 5), b = randInt(1, 5), c = randInt(1, 5), d = randInt(1, 5)
  const answer = a * c + b * d
  return { question: `If A = [[${a}, ${b}]] and B = [[${c}], [${d}]], what is the product A × B?`, answer }
}

function complexNumbers912() {
  const type = randInt(0, 2)
  if (type === 0) {
    // Powers of i
    const n = randInt(2, 20)
    const answers = ['1', 'i', '-1', '-i']
    return { question: `i^${n} = ?`, answer: answers[n % 4] }
  } else if (type === 1) {
    // Add complex
    const a = randInt(-8, 8), b = randInt(-8, 8), c = randInt(-8, 8), d = randInt(-8, 8)
    const re = a + c, im = b + d
    const imStr = im >= 0 ? `+ ${im}i` : `− ${Math.abs(im)}i`
    return { question: `(${a} + ${b}i) + (${c} + ${d}i) = ?`, answer: `${re} ${imStr}` }
  }
  // Multiply complex
  const a = randInt(1, 5), b = randInt(1, 5)
  const re = a * a - b * b, im = 2 * a * b
  const bStr = b >= 0 ? `+ ${b}i` : `− ${Math.abs(b)}i`
  const imStr = im >= 0 ? `+ ${im}i` : `− ${Math.abs(im)}i`
  return { question: `(${a} ${bStr})² = ?`, answer: `${re} ${imStr}` }
}

function trigValues912() {
  const angles = [
    { deg: 0, sin: '0', cos: '1', tan: '0' },
    { deg: 30, sin: '1/2', cos: '√3/2', tan: '√3/3' },
    { deg: 45, sin: '√2/2', cos: '√2/2', tan: '1' },
    { deg: 60, sin: '√3/2', cos: '1/2', tan: '√3' },
    { deg: 90, sin: '1', cos: '0', tan: 'undefined' },
  ]
  const angle = pick(angles)
  const func = pick(['sin', 'cos', 'tan'])
  return { question: `${func}(${angle.deg}°) = ?`, answer: angle[func] }
}

function permComb912() {
  const isPerm = Math.random() < 0.5
  const n = randInt(4, 10), r = randInt(2, Math.min(4, n))
  if (isPerm) {
    const answer = factorial(n) / factorial(n - r)
    return { question: `${n}P${r} = ?`, answer }
  }
  const answer = factorial(n) / (factorial(r) * factorial(n - r))
  return { question: `${n}C${r} = ?`, answer }
}

function derivative912() {
  // Power rule: d/dx [ax^n] = anx^(n-1)
  const a = randInt(1, 8), n = randInt(2, 5)
  const coeff = a * n, exp = n - 1
  let answer
  if (exp === 0) answer = `${coeff}`
  else if (exp === 1) answer = `${coeff}x`
  else answer = `${coeff}x^${exp}`
  return { question: `Find d/dx [${a === 1 ? '' : a}x^${n}]`, answer }
}

function geometricMean912() {
  // geometric mean of a and b = sqrt(a*b), pick values that give integer results
  const root = randInt(2, 12)
  const a = randInt(2, 6)
  const product = root * root
  const b = product / a
  if (!Number.isInteger(b) || b < 1) return geometricMean912()
  return { question: `What is the geometric mean of ${a} and ${b}?`, answer: root }
}

// ─── Problem pools by level ──────────────────────────────────────────

const GENERATORS = {
  '3/4': [add34, subtract34, multiply34, divide34, divideWithRemainder34, fractionAddLike34, multiplyByTens34, twoStep34, round34],
  '5/6': [multiDigitMultiply56, longDivision56, decimalAdd56, decimalMultiply56, fractionAddUnlike56, orderOfOps56, gcfLcm56, percentOf56, area56, solveOneStep56],
  '7-9': [integerOps79, proportions79, exponentRules79, pythagorean79, circleCalc79, multiStepEq79, slope79, volume79, sciNotation79],
  '9-12': [polyFactor912, logarithm912, matrix912, complexNumbers912, trigValues912, permComb912, derivative912, geometricMean912],
}

export function generateProblem(level) {
  const pool = GENERATORS[level]
  if (!pool) return generateProblem('7-9') // fallback
  const generator = pick(pool)
  return generator()
}

export function generateRound(level, count = 10) {
  return Array.from({ length: count }, () => generateProblem(level))
}
