import { useState, useEffect } from 'react'

export default function Vocabulary({ api, user, token, authHeaders }) {
  const [words, setWords] = useState([])
  const [loading, setLoading] = useState(true)
  const [newWord, setNewWord] = useState('')
  const [newTranslation, setNewTranslation] = useState('')
  const [showFlashcards, setShowFlashcards] = useState(false)
  const [flashcards, setFlashcards] = useState([])
  const [cardIndex, setCardIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)

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

  const startFlashcards = () => {
    if (words.length === 0) return
    const shuffled = [...words].sort(() => Math.random() - 0.5)
    setFlashcards(shuffled)
    setCardIndex(0)
    setShowAnswer(false)
    setShowFlashcards(true)
  }

  const nextCard = () => {
    if (flashcards.length === 0) return
    setCardIndex((prev) => (prev + 1) % flashcards.length)
    setShowAnswer(false)
  }

  const prevCard = () => {
    if (flashcards.length === 0) return
    setCardIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length)
    setShowAnswer(false)
  }

  if (loading) return <div className="loading">⏳ Načítání...</div>

  return (
    <div className="vocabulary-page">
      <h2>📖 Můj slovníček ({words.length} slov)</h2>

      <div className="vocab-actions">
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
        <button className="btn-flashcards" onClick={startFlashcards} disabled={words.length === 0}>
          🃏 Flashcards
        </button>
      </div>

      {showFlashcards && flashcards.length > 0 && (
        <div className="flashcard-panel">
          <div className="flashcard">
            <div className="flashcard-word">{flashcards[cardIndex].word}</div>
            {showAnswer ? (
              <div className="flashcard-translation">
                {flashcards[cardIndex].translation || '—'}
              </div>
            ) : (
              <div className="flashcard-translation hidden">Odpověď skryta</div>
            )}
          </div>
          <div className="flashcard-controls">
            <button onClick={prevCard}>◀︎</button>
            <button onClick={() => setShowAnswer(s => !s)}>
              {showAnswer ? 'Skrýt' : 'Ukázat'}
            </button>
            <button onClick={nextCard}>▶︎</button>
          </div>
          <div className="flashcard-progress">
            {cardIndex + 1} / {flashcards.length}
          </div>
        </div>
      )}

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
