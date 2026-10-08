// Builds the encrypted JH practice bank (src/data/jh.enc.json) from the
// private AGQBA JH packet .docx files.
//
// The packets are licensed for team use only and this repo is public, so the
// .docx folder is gitignored and only ciphertext is committed. The password is
// never stored in the repo — pass it in via the JH_PASSWORD env var.
//
// Usage:
//   JH_PASSWORD=... node scripts/build-jh.mjs ["<packet folder>"] [--dump out.jh-plain.json]
//
// Requires the `unzip` CLI (preinstalled on macOS and most Linux).

import { execFileSync } from 'node:child_process'
import { readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const DEFAULT_DIR = '1JH - Practice Qs - 2026-27'
const OUT_FILE = 'src/data/jh.enc.json'
const PBKDF2_ITERATIONS = 600000

// ─── .docx → lines (text + per-character underline flags) ───

const ENTITIES = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" }
const decode = s => s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) =>
  e[0] === '#'
    ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10))
    : ENTITIES[e] ?? m)

function readLines(file) {
  const xml = execFileSync('unzip', ['-p', file, 'word/document.xml'], { encoding: 'utf8', maxBuffer: 64 << 20 })
  const lines = []
  for (const [para] of xml.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)) {
    let text = ''
    let flags = []
    const push = (s, u) => { text += s; flags.push(...Array(s.length).fill(u)) }
    for (const [run] of para.matchAll(/<w:r[ >][\s\S]*?<\/w:r>/g)) {
      const rPr = run.match(/<w:rPr>[\s\S]*?<\/w:rPr>/)?.[0] || ''
      const u = /<w:u(?:\s+w:val="(?!none")[^"]*")?\s*\/>/.test(rPr)
      for (const m of run.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:(tab|br|cr|noBreakHyphen)(?:\s[^>]*)?\/>/g)) {
        if (m[1] !== undefined) push(decode(m[1]), u)
        else if (m[2] === 'tab') push(' ', false)
        else if (m[2] === 'noBreakHyphen') push('-', u)
        else push('\n', false)
      }
    }
    // Soft line breaks split a paragraph into separate lines
    let start = 0
    for (let i = 0; i <= text.length; i++) {
      if (i === text.length || text[i] === '\n') {
        const line = clean(text.slice(start, i), flags.slice(start, i))
        if (line.text) lines.push(line)
        start = i + 1
      }
    }
  }
  return lines
}

// Collapse whitespace while keeping underline flags aligned with characters
function clean(text, flags) {
  let t = ''
  const f = []
  for (let i = 0; i < text.length; i++) {
    const ch = /\s/.test(text[i]) ? ' ' : text[i]
    if (ch === ' ' && (t === '' || t.endsWith(' '))) continue
    t += ch
    f.push(ch === ' ' ? false : flags[i])
  }
  while (t.endsWith(' ')) { t = t.slice(0, -1); f.pop() }
  return { text: t, flags: f }
}

const sliceLine = (line, a, b = line.text.length) => clean(line.text.slice(a, b), line.flags.slice(a, b))

// Split lines that carry an inline "ANSWER:" or a following numbered question
function splitInline(lines) {
  const out = []
  const queue = [...lines]
  while (queue.length) {
    const line = queue.shift()
    // A "<Category>" tag that wrapped onto its own line belongs to the answer above
    if (/^<[^<>]+>$/.test(line.text) && out.length && isAnswer(out.at(-1))) {
      const prev = out.pop()
      out.push(clean(prev.text + ' ' + line.text, [...prev.flags, false, ...line.flags]))
      continue
    }
    const ansAt = line.text.search(/\bANSWER:/)
    if (ansAt > 0) {
      out.push(sliceLine(line, 0, ansAt))
      queue.unshift(sliceLine(line, ansAt))
      continue
    }
    if (ansAt === 0) {
      // "ANSWER: France [or X] 2. Napoleon led..." — next question run into the answer
      const m = line.text.slice(8).match(/\s(\d{1,2})\.\s+(?=\S.{15,})/)
      if (m) {
        const at = 8 + m.index
        out.push(sliceLine(line, 0, at))
        queue.unshift(sliceLine(line, at))
        continue
      }
    }
    out.push(line)
  }
  return out
}

// ─── Answer parsing ───

const stripQuotes = s => s.replace(/^[\s"“”'‘’]+|[\s"“”'‘’.,:;!?]+$/g, '').trim()
const isAnswer = line => /^ANSWER\b/.test(line.text)
const stripNumber = s => s
  .replace(/^\d{1,2}\.\s*/, '')
  .replace(/^\(Note to reader:[^)]*\)\s*/i, '')
  .replace(/\s*\{pause\}/gi, '')

// Maximal underlined runs, keeping only whole words (or partial words of 4+
// letters, e.g. "**trench**es") so stray underlined initials aren't accepted.
function underlinedSegments(text, flags) {
  const segs = []
  let start = -1
  for (let i = 0; i <= text.length; i++) {
    if (i < text.length && flags[i]) { if (start < 0) start = i; continue }
    if (start < 0) continue
    const seg = text.slice(start, i)
    const wholeWord = !/\p{L}/u.test(text[start - 1] || '') && !/\p{L}/u.test(text[i] || '')
    if (wholeWord || seg.trim().length >= 4) segs.push(seg)
    start = -1
  }
  return segs
    .map(s => stripQuotes(s.replace(/^\s*(accept|or)\s+/i, '')))
    .filter(s => s && !/^answer:?$/i.test(s))
}

const FREEFORM = /^(either|any|anything|answers?|equivalents?|reasonable|word forms?|other|clear|descriptions?|synonyms?|in (?:either|any) order)\b/i
const CLAUSE_SPLIT = /;|,\s*(?=(?:or|accept|prompt|reject|do not accept|don't accept|anti-prompt)\b)/gi
const REJECT_RE = /^(reject|do not accept|don't accept)\b\s*/i
const PROMPT_RE = /^(anti-)?prompt\b(\s+on)?\s*/i

function splitAlternatives(s, splitAnd = false) {
  return s
    .replace(/\s+(until|before|after|but not|if)\b.*$/i, '')
    .split(splitAnd ? /\s+or\s+|\s*,\s*or\s+|\s+and\s+(?:on\s+)?/i : /\s+or\s+|\s*,\s*or\s+/i)
    .map(stripQuotes)
    .filter(x => x && !FREEFORM.test(x))
}

function parseAnswer(line) {
  const body = sliceLine(line, line.text.match(/^ANSWER:?\s*/)[0].length)
  let text = body.text
  let category = null
  const catMatch = text.match(/\s*<([^<>]+)>\s*$/)
  if (catMatch) {
    category = catMatch[1].trim()
    text = text.slice(0, catMatch.index).trim()
  }
  const flags = body.flags.slice(0, text.length)

  // Some answers write alternates as "(accept X; prompt on Y)" — treat those like [brackets]
  const chars = [...text]
  for (const m of text.matchAll(/\((\s*["“]?(?:or|accept|also accept|prompt|reject|do not accept)\b[^)]*)\)?/gi)) {
    chars[m.index] = '['
    if (text[m.index + m[0].length - 1] === ')') chars[m.index + m[0].length - 1] = ']'
  }
  text = chars.join('')

  // Underlines with the single spaces between underlined words filled in,
  // since Word usually leaves those spaces un-underlined
  const merged = flags.map((u, i) => u || (text[i] === ' ' && flags[i - 1] && flags[i + 1]))

  // Display string with **required** portions marked
  let display = ''
  let inU = false
  for (let i = 0; i < text.length; i++) {
    if (merged[i] !== inU) { display += '**'; inU = merged[i] }
    display += text[i]
  }
  if (inU) display += '**'

  const accept = new Set()
  const prompt = new Set()
  const reject = new Set()

  const main = text.replace(/\[[^\]]*\]?/g, ' ').trim()
  const mainNoParens = stripQuotes(main.replace(/\([^)]*\)?/g, ' ').replace(/\s+/g, ' '))
  if (mainNoParens) accept.add(mainNoParens)
  // Spoken forms of math answers, e.g. √3 (“root three” or “square root of three”)
  if (/[\d√π⅙½⅓¼⅔¾]/.test(mainNoParens)) {
    for (const [, inner] of main.matchAll(/\(([^)]*)\)/g)) {
      for (const [, q] of inner.matchAll(/[“"]([^”"]+)[”"]/g)) accept.add(stripQuotes(q))
    }
  }

  let eitherOrder = false
  const inBrackets = Array(text.length).fill(false)
  const acceptClauses = []
  for (const region of text.matchAll(/\[([^\]]*)\]?/g)) {
    inBrackets.fill(true, region.index, region.index + region[0].length)
    const inner = region[1]
    const base = region.index + 1
    let from = 0
    const bounds = [...inner.matchAll(CLAUSE_SPLIT)].map(m => [m.index, m[0].length])
    bounds.push([inner.length, 0])
    for (const [at, len] of bounds) {
      const raw = inner.slice(from, at)
      const range = [base + from, base + at]
      from = at + len
      const clause = stripQuotes(raw.replace(/^\s*["“]/, ''))
      if (!clause) continue
      if (REJECT_RE.test(clause)) {
        for (const x of splitAlternatives(clause.replace(REJECT_RE, ''))) reject.add(x)
      } else if (PROMPT_RE.test(clause)) {
        for (const x of splitAlternatives(clause.replace(PROMPT_RE, ''), true)) prompt.add(x)
      } else {
        if (/in (either|any) order/i.test(clause)) eitherOrder = true
        for (const x of splitAlternatives(clause.replace(/^((also\s+)?accept|or)\s+/i, '').replace(/^(or|accept)\s+/i, ''))) accept.add(x)
        // Each "or" alternative in the clause is its own underline region
        let subStart = range[0]
        for (const m of raw.matchAll(/\s+or\s+/gi)) {
          acceptClauses.push([subStart, range[0] + m.index])
          subStart = range[0] + m.index + m[0].length
        }
        acceptClauses.push([subStart, range[1]])
      }
    }
  }

  if (eitherOrder) {
    // "Pakistan and India [accept in either order]" — both parts are required
    const parts = mainNoParens.split(/\s+and\s+/i)
    if (parts.length === 2) accept.add(`${parts[1]} and ${parts[0]}`)
  } else {
    // Underlined portions are the minimum required answer. Several underlined
    // pieces in one clause are all required ("**Robert** F. **Kennedy Jr**."),
    // unless the answer says "accept either".
    const either = /\beither\b/i.test(text)
    const regions = [merged.map((u, i) => u && !inBrackets[i])]
    for (const [a, b] of acceptClauses) regions.push(merged.map((u, i) => u && i >= a && i < b))
    for (const mask of regions) {
      const segs = underlinedSegments(text, mask)
      if (segs.length) accept.add(segs.join(' '))
      if (either) {
        for (const seg of underlinedSegments(text, flags.map((u, i) => u && mask[i]))) accept.add(seg)
      }
    }
  }
  for (const r of reject) accept.delete(r)
  for (const p of prompt) accept.delete(p)

  const answer = { display, accept: [...accept] }
  if (prompt.size) answer.prompt = [...prompt]
  if (reject.size) answer.reject = [...reject]
  return { answer, category }
}

// ─── Packet structure ───

function pairUp(lines) {
  const pairs = []
  let buf = []
  for (const line of lines) {
    if (isAnswer(line)) {
      pairs.push({ pre: buf, ans: line })
      buf = []
    } else buf.push(line)
  }
  return { pairs, leftover: buf }
}

const MATH_RE = /pencil and paper|paper ready/i

function makeTossup(pair, packet, quarter) {
  const question = stripNumber(pair.pre.map(l => l.text).join(' '))
  const { answer, category } = parseAnswer(pair.ans)
  const t = { packet, quarter, question, answer, category: category || 'Other' }
  if (MATH_RE.test(question) || /computation/i.test(category || '')) t.math = true
  return t
}

const INTRO_START = /\s+((?:Answer|Given|Name|Regarding|Identify|For each|Who is|What is|Which)\b.*)$/

function parsePacket(lines, packet, warn) {
  const at = name => lines.findIndex(l => new RegExp(`^Quarter ${name}\\b`, 'i').test(l.text))
  const idx = ['One', 'Two', 'Three', 'Four'].map(at)
  if (idx.some(i => i < 0)) throw new Error(`Packet ${packet}: missing a "Quarter" header`)
  const section = q => splitInline(lines.slice(idx[q] + 1, idx[q + 1] ?? lines.length))

  const tossups = []
  const bonuses = []
  const lightning = []

  for (const q of [0, 1, 3]) {
    const { pairs, leftover } = pairUp(section(q))
    if (leftover.length) warn(`Q${q + 1} leftover text: ${leftover.map(l => l.text).join(' | ').slice(0, 120)}`)
    for (const pair of pairs) {
      const hasCategory = /<[^<>]+>\s*$/.test(pair.ans.text)
      if (q === 1 && !hasCategory) {
        const { answer } = parseAnswer(pair.ans)
        const part = { question: stripNumber(pair.pre.at(-1)?.text || ''), answer }
        if (pair.pre.length >= 2 || bonuses.length === 0) {
          bonuses.push({ packet, leadin: stripNumber(pair.pre.slice(0, -1).map(l => l.text).join(' ')), parts: [part] })
        } else {
          bonuses.at(-1).parts.push(part)
        }
      } else {
        tossups.push(makeTossup(pair, packet, q + 1))
      }
    }
  }

  let set = null
  let pending = []
  for (const line of section(2)) {
    const cat = line.text.match(/^category:\s*(.*)$/i)
    if (cat) {
      let title = cat[1].trim()
      let intro = ''
      const m = title.match(INTRO_START)
      if (m) { intro = m[1]; title = title.slice(0, m.index).trim() }
      set = { packet, title: title.replace(/[.:]$/, ''), intro, questions: [] }
      lightning.push(set)
      pending = []
      continue
    }
    if (!set) { warn(`Q3 text before first category: ${line.text.slice(0, 80)}`); continue }
    if (isAnswer(line)) {
      if (!pending.length) { warn(`Q3 answer with no question in "${set.title}"`); continue }
      set.questions.push({ question: stripNumber(pending.map(l => l.text).join(' ')), answer: parseAnswer(line).answer })
      pending = []
    } else if (!set.questions.length && !pending.length && !/^\d{1,2}\./.test(line.text)) {
      set.intro = [set.intro, line.text].filter(Boolean).join(' ')
    } else {
      pending.push(line)
    }
  }

  const numeric = a => /^[-−$]?[\d√⅙½⅓¼⅔¾]/.test(a.accept[0] || '')
  for (const b of bonuses) if (MATH_RE.test(b.leadin) || b.parts.filter(p => numeric(p.answer)).length >= 2) b.math = true
  return { number: packet, tossups, bonuses, lightning }
}

// ─── Encryption (WebCrypto, mirrored by src/utils/jhBank.js) ───

async function encrypt(plain, password) {
  const { subtle } = globalThis.crypto
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const baseKey = await subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey'])
  const key = await subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITERATIONS },
    baseKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt'],
  )
  const ct = await subtle.encrypt({ name: 'AES-GCM', iv }, key, plain)
  const b64 = buf => Buffer.from(buf).toString('base64')
  return { v: 1, iterations: PBKDF2_ITERATIONS, salt: b64(salt), iv: b64(iv), data: b64(ct) }
}

// ─── Main ───

const args = process.argv.slice(2)
const dumpAt = args.indexOf('--dump')
const dumpPath = dumpAt >= 0 ? args.splice(dumpAt, 2)[1] : null
const dir = args[0] || DEFAULT_DIR

const files = readdirSync(dir)
  .map(name => ({ name, n: Number(name.match(/Packet\s+(\d+)/i)?.[1]) }))
  .filter(f => f.n && f.name.endsWith('.docx'))
  .sort((a, b) => a.n - b.n)

let problems = 0
const packets = files.map(({ name, n }) => {
  const warn = msg => { problems++; console.warn(`  ! Packet ${n}: ${msg}`) }
  const p = parsePacket(readLines(join(dir, name)), n, warn)
  const qCounts = [1, 2, 4].map(q => p.tossups.filter(t => t.quarter === q).length)
  if (qCounts.join() !== '20,10,20') warn(`tossups per quarter ${qCounts.join('/')} (expected 20/10/20)`)
  if (p.bonuses.length !== 4 || p.bonuses.some(b => b.parts.length !== 4)) warn(`bonus parts ${p.bonuses.map(b => b.parts.length).join('/')}`)
  if (p.lightning.length !== 3 || p.lightning.some(s => s.questions.length !== 10)) warn(`lightning ${p.lightning.map(s => `${s.title}:${s.questions.length}`).join(', ')}`)
  console.log(`Packet ${String(n).padStart(2)}: ${p.tossups.length} tossups, ${p.bonuses.length} bonuses, ${p.lightning.map(s => s.title).join(' / ')}`)
  return p
})

const bank = { title: 'AGQBA JH 2026-27 Practice', packets }
const json = JSON.stringify(bank)
if (dumpPath) {
  writeFileSync(dumpPath, JSON.stringify(bank, null, 2))
  console.log(`Wrote plaintext dump to ${dumpPath} (do not commit)`)
}

const password = process.env.JH_PASSWORD
if (!password) {
  console.log(`\nJH_PASSWORD not set — skipped writing ${OUT_FILE}.`)
} else {
  const enc = await encrypt(gzipSync(json, { level: 9 }), password)
  writeFileSync(OUT_FILE, JSON.stringify(enc) + '\n')
  console.log(`\nWrote ${OUT_FILE} (${(JSON.stringify(enc).length / 1024).toFixed(0)} KB encrypted, ${(json.length / 1024).toFixed(0)} KB plain)`)
}
if (problems) console.warn(`\n${problems} structural warning(s) — review above.`)
