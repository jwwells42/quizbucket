import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { useLevel, ALL_LEVELS, LEVEL_LABELS } from '../context/LevelContext'

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/flashcards', label: 'Flashcards' },
  { to: '/tossup', label: 'Tossup' },
  { to: '/lightning', label: 'Lightning' },
  { to: '/memorize', label: 'Memorize' },
  { to: '/computation', label: 'Computation' },
  { to: '/sequence', label: 'Sequences' },
]

export default function Layout({ children }) {
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const { level, setLevel } = useLevel()

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <nav className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold tracking-tight text-indigo-400">
            QuizBucket
          </Link>

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-1">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  location.pathname === link.to || (link.to !== '/' && location.pathname.startsWith(link.to))
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="ml-2 pl-2 border-l border-gray-700">
              <select
                value={level || ''}
                onChange={e => setLevel(e.target.value || null)}
                className="bg-gray-800 text-gray-300 text-sm rounded px-2 py-1.5 border border-gray-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="">All Levels</option>
                {ALL_LEVELS.map(l => (
                  <option key={l} value={l}>{LEVEL_LABELS[l]}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Mobile hamburger */}
          <button
            className="sm:hidden p-1 text-gray-400"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="sm:hidden border-t border-gray-800 px-4 py-2 space-y-1">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className={`block px-3 py-2 rounded text-sm font-medium ${
                  location.pathname === link.to || (link.to !== '/' && location.pathname.startsWith(link.to))
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-400 hover:bg-gray-800'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="px-3 py-2">
              <select
                value={level || ''}
                onChange={e => { setLevel(e.target.value || null); setMenuOpen(false) }}
                className="w-full bg-gray-800 text-gray-300 text-sm rounded px-2 py-1.5 border border-gray-700 focus:outline-none focus:border-indigo-500"
              >
                <option value="">All Levels</option>
                {ALL_LEVELS.map(l => (
                  <option key={l} value={l}>{LEVEL_LABELS[l]}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
