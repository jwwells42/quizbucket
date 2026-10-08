import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { decryptBank, getSessionPassword, setSessionPassword } from '../../utils/jhBank'
import { useJhProgress } from '../../hooks/useJhProgress'
import TossupRound from './TossupRound'
import LightningRound from './LightningRound'

// Private team practice with the AGQBA JH 2026-27 practice packets.
// Not linked from the site; the packet bank is encrypted and unlocked with the team password.

const MIXED_TOSSUP_ROUND = 20
const MIXED_BONUS_ROUND = 10

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const btnPrimary = 'px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-500 transition-colors'
const btnAmber = 'px-6 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-500 transition-colors'
const btnGray = 'px-6 py-2 bg-gray-700 text-gray-300 rounded-lg font-medium hover:bg-gray-600 transition-colors'

export default function JH() {
  const [bank, setBank] = useState(null)
  const [unlocking, setUnlocking] = useState(() => !!getSessionPassword())
  const [error, setError] = useState('')

  const unlock = useCallback(async password => {
    setUnlocking(true)
    setError('')
    try {
      const data = await decryptBank(password)
      if (data) {
        setSessionPassword(password)
        setBank(data)
      } else {
        setSessionPassword(null)
        setError('Incorrect password')
      }
    } catch (e) {
      setError(e.message || 'Could not unlock')
    }
    setUnlocking(false)
  }, [])

  // Re-unlock after a refresh with the password saved for this tab
  useEffect(() => {
    const saved = getSessionPassword()
    if (!saved) return
    let cancelled = false
    decryptBank(saved)
      .then(data => {
        if (cancelled) return
        if (data) setBank(data)
        else setSessionPassword(null)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setUnlocking(false) })
    return () => { cancelled = true }
  }, [])

  const lock = () => {
    setSessionPassword(null)
    setBank(null)
  }

  if (!bank) return <PasswordGate unlocking={unlocking} error={error} onSubmit={unlock} />
  return <JHPractice bank={bank} onLock={lock} />
}

function PasswordGate({ unlocking, error, onSubmit }) {
  const [value, setValue] = useState('')
  return (
    <div className="max-w-sm mx-auto mt-12">
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h1 className="text-xl font-bold mb-1">Team Practice</h1>
        <p className="text-sm text-gray-500 mb-4">Enter the team password to continue.</p>
        <form onSubmit={e => { e.preventDefault(); if (value) onSubmit(value) }} className="space-y-3">
          <input
            type="password"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="Password"
            autoFocus
            autoComplete="off"
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={unlocking || !value}
            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-500 disabled:opacity-40 transition-colors"
          >
            {unlocking ? 'Unlocking…' : 'Unlock'}
          </button>
        </form>
      </div>
    </div>
  )
}

function Crumbs({ items }) {
  return (
    <div className="text-sm text-gray-500 mb-4 flex flex-wrap items-center gap-1">
      {items.map(([label, to], i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span>/</span>}
          {to ? <Link to={to} className="hover:text-gray-300">{label}</Link> : <span className="text-gray-400">{label}</span>}
        </span>
      ))}
    </div>
  )
}

function JHPractice({ bank, onLock }) {
  const [params] = useSearchParams()
  const { progress, recordRound } = useJhProgress()

  const all = useMemo(() => {
    const tossups = bank.packets.flatMap(p => p.tossups)
    const counts = {}
    for (const t of tossups) counts[t.category] = (counts[t.category] || 0) + 1
    return {
      tossups,
      bonuses: bank.packets.flatMap(p => p.bonuses),
      lightning: bank.packets.flatMap(p => p.lightning.map((set, i) => ({ ...set, key: `${p.number}-${i}`, progressKey: `p${p.number}-l${i}` }))),
      categories: Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count })),
    }
  }, [bank])

  const packet = bank.packets.find(p => p.number === Number(params.get('packet')))
  const quarter = Number(params.get('q'))
  const mode = params.get('mode')
  const setParam = params.get('set')

  if (packet && [1, 2, 4].includes(quarter)) {
    return <QuarterView key={`${packet.number}-${quarter}`} packet={packet} quarter={quarter} recordRound={recordRound} />
  }
  if (packet && quarter === 3) {
    const index = setParam === null ? -1 : Number(setParam)
    if (packet.lightning[index]) {
      return <PacketLightningView key={`${packet.number}-${index}`} packet={packet} index={index} recordRound={recordRound} />
    }
    return <PacketLightningPicker packet={packet} progress={progress} />
  }
  if (packet) return <PacketOverview packet={packet} progress={progress} />
  if (mode === 'tossups' || mode === 'bonus') {
    return <MixedTossups key={mode} all={all} bonusMode={mode === 'bonus'} recordRound={recordRound} />
  }
  if (mode === 'lightning') {
    const set = all.lightning.find(s => s.key === setParam)
    if (set) return <MixedLightningView key={set.key} set={set} recordRound={recordRound} />
    return <LightningPicker all={all} progress={progress} />
  }
  return <Menu bank={bank} all={all} progress={progress} onLock={onLock} />
}

// ─── Menu ───

const PACKET_PARTS = number => [`p${number}-q1`, `p${number}-q2`, `p${number}-l0`, `p${number}-l1`, `p${number}-l2`, `p${number}-q4`]

function Menu({ bank, all, progress, onLock }) {
  const lightningQs = all.lightning.reduce((sum, s) => sum + s.questions.length, 0)
  const modes = [
    {
      to: '/jh?mode=tossups',
      title: 'Tossups',
      description: `${MIXED_TOSSUP_ROUND} random tossups from all ${bank.packets.length} packets (${all.tossups.length} total). Filter by category.`,
      accent: 'bg-emerald-500',
    },
    {
      to: '/jh?mode=bonus',
      title: 'Tossup + Bonus',
      description: `${MIXED_BONUS_ROUND} tossups; each one you get earns a 4-part bonus (${all.bonuses.length} bonus sets).`,
      accent: 'bg-amber-500',
    },
    {
      to: '/jh?mode=lightning',
      title: 'Lightning',
      description: `60-second rounds from ${all.lightning.length} categories (${lightningQs} questions).`,
      accent: 'bg-orange-500',
    },
  ]

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">JH Team Practice</h1>
          <p className="text-sm text-gray-500">{bank.title} · team use only, please don&apos;t share</p>
        </div>
        <button onClick={onLock} className="px-3 py-1.5 text-xs bg-gray-800 text-gray-400 rounded font-medium hover:bg-gray-700 transition-colors">
          Lock
        </button>
      </div>

      <h2 className="text-lg font-semibold mb-3">Mixed Practice</h2>
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        {modes.map(m => (
          <Link key={m.to} to={m.to} className="block rounded-lg overflow-hidden bg-gray-900 border border-gray-800 hover:border-gray-700 transition-colors">
            <div className={`${m.accent} h-1.5`} />
            <div className="p-5">
              <h3 className="text-lg font-semibold mb-1">{m.title}</h3>
              <p className="text-sm text-gray-500">{m.description}</p>
            </div>
          </Link>
        ))}
      </div>

      <h2 className="text-lg font-semibold mb-1">Packets</h2>
      <p className="text-sm text-gray-500 mb-3">Play a packet quarter by quarter, the way it would be read at a match.</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {bank.packets.map(p => {
          const parts = PACKET_PARTS(p.number)
          const done = parts.filter(k => progress[k]).length
          return (
            <Link
              key={p.number}
              to={`/jh?packet=${p.number}`}
              className="block bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-lg p-4 transition-colors"
            >
              <div className="font-semibold mb-2">Packet {p.number}</div>
              <div className="flex gap-1" title={`${done} of ${parts.length} rounds played`}>
                {parts.map(k => (
                  <span key={k} className={`h-1.5 flex-1 rounded-full ${progress[k] ? 'bg-indigo-500' : 'bg-gray-800'}`} />
                ))}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

// ─── Packet views ───

const QUARTER_INFO = {
  1: { title: 'Quarter 1', description: '20 tossups' },
  2: { title: 'Quarter 2', description: '10 tossups with 4-part bonuses' },
  3: { title: 'Quarter 3', description: 'Lightning round — 3 categories' },
  4: { title: 'Quarter 4', description: '20 tossups' },
}

function ScoreLine({ entry, max, unit = '' }) {
  if (!entry) return <span className="text-xs text-gray-600">Not played</span>
  return (
    <span className="text-xs text-gray-500">
      Last: {entry.correct}/{entry.total}{entry.points !== undefined ? ` · ${entry.points} pts` : ''}
      {entry.plays > 1 && ` · Best: ${entry.best}${max ? `/${max}` : ''}${unit}`}
    </span>
  )
}

function PacketOverview({ packet, progress }) {
  const n = packet.number
  return (
    <div>
      <Crumbs items={[['JH Practice', '/jh'], [`Packet ${n}`]]} />
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold">Packet {n}</h1>
        <Link to={`/jh?packet=${n}&q=1`} className={btnPrimary}>Play from Quarter 1 →</Link>
      </div>

      <div className="space-y-3">
        {[1, 2].map(q => (
          <QuarterCard key={q} n={n} q={q} entry={progress[`p${n}-q${q}`]} />
        ))}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-baseline gap-2 mb-3">
            <span className="font-semibold">{QUARTER_INFO[3].title}</span>
            <span className="text-sm text-gray-500">{QUARTER_INFO[3].description}</span>
          </div>
          <LightningSetList packet={packet} progress={progress} />
        </div>
        <QuarterCard n={n} q={4} entry={progress[`p${n}-q4`]} />
      </div>
    </div>
  )
}

function QuarterCard({ n, q, entry }) {
  return (
    <Link
      to={`/jh?packet=${n}&q=${q}`}
      className="flex items-center justify-between gap-4 bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-lg p-4 transition-colors"
    >
      <div>
        <span className="font-semibold">{QUARTER_INFO[q].title}</span>
        <span className="text-sm text-gray-500 ml-2">{QUARTER_INFO[q].description}</span>
      </div>
      <ScoreLine entry={entry} unit=" pts" />
    </Link>
  )
}

function LightningSetList({ packet, progress }) {
  return (
    <div className="grid sm:grid-cols-3 gap-2">
      {packet.lightning.map((set, i) => (
        <Link
          key={i}
          to={`/jh?packet=${packet.number}&q=3&set=${i}`}
          className="block bg-gray-800/60 hover:bg-gray-800 border border-gray-700/50 rounded-lg p-3 transition-colors"
        >
          <div className="text-sm font-medium text-amber-300 mb-1">{set.title}</div>
          <ScoreLine entry={progress[`p${packet.number}-l${i}`]} max={set.questions.length} />
        </Link>
      ))}
    </div>
  )
}

function QuarterView({ packet, quarter, recordRound }) {
  const [round, setRound] = useState(0)
  const n = packet.number
  const tossups = useMemo(() => packet.tossups.filter(t => t.quarter === quarter), [packet, quarter])
  const onFinish = useCallback(
    (roundId, summary) => recordRound(`p${n}-q${quarter}`, roundId, summary),
    [recordRound, n, quarter],
  )
  const next = quarter === 4 ? null : quarter + 1

  return (
    <div>
      <Crumbs items={[['JH Practice', '/jh'], [`Packet ${n}`, `/jh?packet=${n}`], [QUARTER_INFO[quarter].title]]} />
      <h1 className="text-2xl font-bold mb-1">Packet {n} · {QUARTER_INFO[quarter].title}</h1>
      <p className="text-sm text-gray-500 mb-6">
        {QUARTER_INFO[quarter].description}. Buzz when you know it; you have 5s to buzz after the question ends
        (30s on computation questions), then 10s to answer.
        {quarter === 2 && ' Bonuses: 5 pts per part, +20 for sweeping all 4.'}
      </p>
      <TossupRound
        key={round}
        tossups={tossups}
        bonuses={quarter === 2 ? packet.bonuses : []}
        onFinish={onFinish}
        footer={
          <>
            {next && <Link to={`/jh?packet=${n}&q=${next}`} className={btnPrimary}>Next: {QUARTER_INFO[next].title} →</Link>}
            <button onClick={() => setRound(r => r + 1)} className={btnGray}>Replay {QUARTER_INFO[quarter].title}</button>
            <Link to={`/jh?packet=${n}`} className={btnGray}>Packet {n} Overview</Link>
          </>
        }
      />
    </div>
  )
}

function PacketLightningPicker({ packet, progress }) {
  const n = packet.number
  return (
    <div>
      <Crumbs items={[['JH Practice', '/jh'], [`Packet ${n}`, `/jh?packet=${n}`], [QUARTER_INFO[3].title]]} />
      <h1 className="text-2xl font-bold mb-1">Packet {n} · Lightning Round</h1>
      <p className="text-sm text-gray-500 mb-6">Pick a category: 10 questions in 60 seconds.</p>
      <LightningSetList packet={packet} progress={progress} />
      <div className="flex justify-center mt-6">
        <Link to={`/jh?packet=${n}&q=4`} className={btnPrimary}>Next: Quarter 4 →</Link>
      </div>
    </div>
  )
}

function PacketLightningView({ packet, index, recordRound }) {
  const [round, setRound] = useState(0)
  const n = packet.number
  const set = packet.lightning[index]
  const onFinish = useCallback(
    (roundId, result) => recordRound(`p${n}-l${index}`, roundId, result),
    [recordRound, n, index],
  )
  return (
    <div>
      <Crumbs items={[['JH Practice', '/jh'], [`Packet ${n}`, `/jh?packet=${n}`], ['Lightning', `/jh?packet=${n}&q=3`], [set.title]]} />
      <LightningRound
        key={round}
        set={set}
        onFinish={onFinish}
        footer={
          <>
            <Link to={`/jh?packet=${n}&q=3`} className={btnAmber}>Other Categories</Link>
            <Link to={`/jh?packet=${n}&q=4`} className={btnPrimary}>Next: Quarter 4 →</Link>
            <button onClick={() => setRound(r => r + 1)} className={btnGray}>Play Again</button>
          </>
        }
      />
    </div>
  )
}

// ─── Mixed practice ───

function MixedTossups({ all, bonusMode, recordRound }) {
  const [selected, setSelected] = useState(() => new Set(all.categories.map(c => c.name)))
  const [round, setRound] = useState(null) // { n, tossups }
  const [seen, setSeen] = useState(() => new Set())
  const size = bonusMode ? MIXED_BONUS_ROUND : MIXED_TOSSUP_ROUND
  const pool = all.tossups.filter(t => selected.has(t.category))
  const progressKey = bonusMode ? 'mixed-bonus' : 'mixed-tossups'

  const onFinish = useCallback(
    (roundId, summary) => recordRound(progressKey, roundId, summary),
    [recordRound, progressKey],
  )

  // Prefer tossups not yet seen this session
  const start = () => {
    const fresh = shuffle(pool.filter(t => !seen.has(t)))
    const picked = [...fresh, ...shuffle(pool.filter(t => seen.has(t)))].slice(0, size)
    setSeen(s => new Set([...s, ...picked]))
    setRound(r => ({ n: (r?.n || 0) + 1, tossups: picked }))
  }

  const toggle = name => setSelected(s => {
    const next = new Set(s)
    if (next.has(name)) next.delete(name)
    else next.add(name)
    return next
  })

  const title = bonusMode ? 'Tossup + Bonus' : 'Tossups'

  if (round) {
    return (
      <div>
        <Crumbs items={[['JH Practice', '/jh'], [title]]} />
        <h1 className="text-2xl font-bold mb-6">{title}</h1>
        <TossupRound
          key={round.n}
          tossups={round.tossups}
          bonuses={bonusMode ? all.bonuses : []}
          randomBonuses
          onFinish={onFinish}
          footer={
            <>
              <button onClick={start} className={btnPrimary}>New Round</button>
              <button onClick={() => setRound(null)} className={btnGray}>Change Categories</button>
            </>
          }
        />
      </div>
    )
  }

  return (
    <div>
      <Crumbs items={[['JH Practice', '/jh'], [title]]} />
      <h1 className="text-2xl font-bold mb-6">{title}</h1>
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
        <p className="text-sm text-gray-400 mb-4">
          {bonusMode
            ? `${size} random tossups from every packet. Get one right to earn a random 4-part bonus (5 pts per part, +20 for a sweep).`
            : `${size} random tossups from every packet, revealed word by word.`}
          {' '}Questions you haven&apos;t seen this session come up first.
        </p>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-sm">Categories</h2>
          <div className="flex gap-3 text-xs">
            <button onClick={() => setSelected(new Set(all.categories.map(c => c.name)))} className="text-indigo-400 hover:text-indigo-300">All</button>
            <button onClick={() => setSelected(new Set())} className="text-indigo-400 hover:text-indigo-300">None</button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {all.categories.map(c => (
            <button
              key={c.name}
              onClick={() => toggle(c.name)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selected.has(c.name) ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {c.name} <span className="opacity-60">{c.count}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="text-center">
        <button
          onClick={start}
          disabled={pool.length === 0}
          className="px-8 py-3 bg-emerald-600 text-white rounded-lg font-bold text-lg hover:bg-emerald-500 disabled:opacity-40 transition-colors"
        >
          Start Round ({Math.min(size, pool.length)} questions)
        </button>
      </div>
    </div>
  )
}

function LightningPicker({ all, progress }) {
  const navigate = useNavigate()
  const playRandom = () => {
    const set = all.lightning[Math.floor(Math.random() * all.lightning.length)]
    navigate(`/jh?mode=lightning&set=${set.key}`)
  }
  return (
    <div>
      <Crumbs items={[['JH Practice', '/jh'], ['Lightning']]} />
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold">Lightning</h1>
        <button onClick={playRandom} className={btnAmber}>Random Category</button>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {all.lightning.map(set => (
          <Link
            key={set.key}
            to={`/jh?mode=lightning&set=${set.key}`}
            className="block bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-lg p-3 transition-colors"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium text-amber-300">{set.title}</span>
              <span className="text-xs text-gray-600 shrink-0">Packet {set.packet}</span>
            </div>
            <ScoreLine entry={progress[set.progressKey]} max={set.questions.length} />
          </Link>
        ))}
      </div>
    </div>
  )
}

function MixedLightningView({ set, recordRound }) {
  const [round, setRound] = useState(0)
  const onFinish = useCallback(
    (roundId, result) => recordRound(set.progressKey, roundId, result),
    [recordRound, set.progressKey],
  )
  return (
    <div>
      <Crumbs items={[['JH Practice', '/jh'], ['Lightning', '/jh?mode=lightning'], [set.title]]} />
      <LightningRound
        key={round}
        set={set}
        onFinish={onFinish}
        footer={
          <>
            <Link to="/jh?mode=lightning" className={btnAmber}>Other Categories</Link>
            <button onClick={() => setRound(r => r + 1)} className={btnGray}>Play Again</button>
          </>
        }
      />
    </div>
  )
}
