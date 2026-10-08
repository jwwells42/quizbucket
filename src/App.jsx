import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import FlashcardList from './pages/FlashcardList'
import FlashcardStudy from './pages/FlashcardStudy'
import Tossup from './pages/Tossup'
import Lightning from './pages/Lightning'
import Memorize from './pages/Memorize'
import Computation from './pages/Computation'

// Private team page (not linked anywhere); loaded on demand with its encrypted packet bank
const JH = lazy(() => import('./pages/jh/JH'))

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/flashcards" element={<FlashcardList />} />
        <Route path="/flashcards/:category" element={<FlashcardStudy />} />
        <Route path="/tossup" element={<Tossup />} />
        <Route path="/lightning" element={<Lightning />} />
        <Route path="/memorize" element={<Memorize />} />
        <Route path="/computation" element={<Computation />} />
        <Route path="/jh" element={<Suspense fallback={null}><JH /></Suspense>} />
      </Routes>
    </Layout>
  )
}
