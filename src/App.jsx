import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import FlashcardList from './pages/FlashcardList'
import FlashcardStudy from './pages/FlashcardStudy'
import Tossup from './pages/Tossup'
import Lightning from './pages/Lightning'
import Memorize from './pages/Memorize'

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
      </Routes>
    </Layout>
  )
}
