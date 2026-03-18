import { useState, useEffect } from 'react'

export default function Vocabulary({ api, user, token, authHeaders }) {
  const [words, setWords] = useState([])
  const [loading, setLoading] = useState(true)
  const [newWord, setNewWord] = useState('')
  const [newTranslation, setNewTranslation] = useState('')

  const fetchWords = () => {
    fetch(`${api}/api/vocabulary`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { setWords(data); setLoading(false) })
  }

  useEffect(() => { fetchWords() }, [])

  const addWord = async (e) => {
    e.preventDefault()
    if (!newWord.trim()) return
    await fetch(`${api}/api/vocabulary`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ word: newWord, translation: newTranslation }),
    })
    setNewWord('')
    setNewTranslation('')
    fetchWords()
  }

  const deleteWord = async (id) => {
    await fetch(`${api}/api/vocabulary/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    })
    fetchWords()
  }

  const speakWord = (word) => {
    const utterance = new SpeechSynthesisUtterance(word)
    utterance.lang = 'cs-CZ'
    utterance.rate = 0.8
    window.speechSynthesis.speak(utterance)
  }

  if (loading) return <div className="loading">⏳ Načítání...</div>

  return (
    <div className="vocabulary-page">
      <h2>📖 Můj slovníček ({words.length} slov)</h2>

      <form className="vocab-add-form" onSubmit={addWord}>
        <input
          placeholder="České slovo"
          value={newWord}
          onChange={e => setNewWord(e.target.value)}
          required
        />
        <input
          placeholder="Překlad (volitelné)"
          value={newTranslation}
          onChange={e => setNewTranslation(e.target.value)}
        />
        <button type="submit">➕ Přidat</button>
      </form>

      {words.length === 0 && (
        <div className="empty-state">
          <div className="empty-emoji">📝</div>
          <p>Zatím žádná slovíčka. V chatu klikni na slovo pro uložení!</p>
        </div>
      )}

      <div className="vocab-list">
        {words.map(w => (
          <div key={w.id} className="vocab-card">
            <div className="vocab-main">
              <button className="btn-speak-small" onClick={() => speakWord(w.word)}>🔊</button>
              <strong className="vocab-word">{w.word}</strong>
              {w.translation && <span className="vocab-translation">= {w.translation}</span>}
            </div>
            {w.context_sentence && <p className="vocab-context">"{w.context_sentence}"</p>}
            <button className="btn-vocab-delete" onClick={() => deleteWord(w.id)}>✕</button>
          </div>
        ))}
      </div>
    </div>
  )
}
