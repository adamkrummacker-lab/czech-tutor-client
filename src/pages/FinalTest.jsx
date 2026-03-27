import { useEffect, useState } from 'react'

export default function FinalTest({ api, token, topic, onBack }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (!topic?.id) {
      setLoading(false)
      setError('Chybí téma pro závěrečný test.')
      return
    }

    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`${api}/api/chat/${topic.id}/evaluate`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Nepodařilo se vyhodnotit test.')
        setResult(data)
      } catch (err) {
        setError(err.message || 'Chyba při vyhodnocení testu.')
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [api, token, topic?.id])

  return (
    <div className="final-test-page">
      <h1>📝 Otestuj mě</h1>
      {loading && <p>⏳ Vyhodnocuji konverzaci…</p>}
      {error && <p className="error-text">⚠️ {error}</p>}

      {result && (
        <div className="final-test-result">
          <div className="final-score">
            <span className="final-score-label">Skóre</span>
            <span className="final-score-value">{result.score ?? '—'}/10</span>
          </div>
          <div className="final-grade">
            <span className="final-score-label">Známka</span>
            <span className="final-score-value">{result.grade ?? '—'}</span>
          </div>
          <div className="final-eval">
            <h3>Hodnocení</h3>
            <p>{result.evaluation}</p>
          </div>

          {Array.isArray(result.vocabularyAdded) && result.vocabularyAdded.length > 0 && (
            <div className="final-vocab">
              <h3>📚 Klíčová slovíčka (uloženo do slovníčku)</h3>
              <ul>
                {result.vocabularyAdded.map(v => (
                  <li key={v.id}>
                    <strong>{v.word}</strong>
                    {v.translation && <span> — {v.translation}</span>}
                    {v.context_sentence && <em> ({v.context_sentence})</em>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <button onClick={() => (onBack ? onBack() : window.history.back())}>Zpět</button>
    </div>
  )
}
