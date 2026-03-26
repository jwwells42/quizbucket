import { useState, useCallback } from 'react'

const STORAGE_KEY = 'quizbucket-custom'

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { texts: [], sequences: [] }
  } catch {
    return { texts: [], sequences: [] }
  }
}

function save(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function useCustomContent() {
  const [data, setData] = useState(load)

  const addText = useCallback((title, text) => {
    setData(prev => {
      const id = 'custom-text-' + Date.now()
      const next = { ...prev, texts: [...prev.texts, { id, title, text }] }
      save(next)
      return next
    })
  }, [])

  const deleteText = useCallback((id) => {
    setData(prev => {
      const next = { ...prev, texts: prev.texts.filter(t => t.id !== id) }
      save(next)
      return next
    })
  }, [])

  const addSequence = useCallback((title, items, chunkSize = 5) => {
    setData(prev => {
      const id = 'custom-seq-' + Date.now()
      // Auto-chunk items into groups
      const chunks = []
      for (let i = 0; i < items.length; i += chunkSize) {
        const slice = items.slice(i, i + chunkSize)
        const start = i + 1
        const end = i + slice.length
        chunks.push({ label: `Items ${start}–${end}`, items: slice })
      }
      const seq = { id, title, description: `Custom list (${items.length} items)`, levels: ['3/4', '5/6', '7-9', '9-12'], chunks }
      const next = { ...prev, sequences: [...prev.sequences, seq] }
      save(next)
      return next
    })
  }, [])

  const deleteSequence = useCallback((id) => {
    setData(prev => {
      const next = { ...prev, sequences: prev.sequences.filter(s => s.id !== id) }
      save(next)
      return next
    })
  }, [])

  return {
    customTexts: data.texts,
    customSequences: data.sequences,
    addText,
    deleteText,
    addSequence,
    deleteSequence,
  }
}
