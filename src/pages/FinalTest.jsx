import { useEffect, useState } from 'react'

export default function FinalTest({ api, token, topic, onBack }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [checked, setChecked] = useState(false)
  const [score, setScore] = useState(0)
  const [quizMessage, setQuizMessage] = useState(null)

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
        const vocabRes = await fetch(`${api}/api/vocabulary`, {
          headers: { 'Authorization': `Bearer ${token}` },
        })
        const vocab = await vocabRes.json()
        buildQuiz(Array.isArray(vocab) ? vocab : [])
      } catch (err) {
        setError(err.message || 'Chyba při vyhodnocení testu.')
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [api, token, topic?.id])

  const buildQuiz = (vocab) => {
    const withTranslation = vocab.filter(v => v.translation && v.translation.trim())
    if (withTranslation.length < 4) {
      setQuizMessage('Pro test potřebuješ alespoň 4 slovíčka s překladem ve slovníčku.')
      setQuestions([])
      return
    }
    const shuffled = [...withTranslation].sort(() => Math.random() - 0.5)
    const picked = shuffled.slice(0, 4)
    const allTranslations = withTranslation.map(v => v.translation.trim())
    const qs = picked.map((v, idx) => {
      const correct = v.translation.trim()
      const options = [correct]
      while (options.length < 4) {
        const candidate = allTranslations[Math.floor(Math.random() * allTranslations.length)]
        if (candidate && !options.includes(candidate)) options.push(candidate)
      }
      options.sort(() => Math.random() - 0.5)
      return { id: idx + 1, word: v.word, correct, options }
    })
    setQuestions(qs)
  }

  const checkQuiz = () => {
    let points = 0
    for (const q of questions) {
      if (answers[q.id] === q.correct) points += 1
    }
    setScore(points)
    setChecked(true)
  }

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

      {quizMessage && <p className="error-text">{quizMessage}</p>}

      {questions.length > 0 && (
        <div className="final-quiz">
          <h3>🎯 Krátký test slovíček</h3>
          {questions.map(q => (
            <div key={q.id} className="quiz-question">
              <div className="quiz-word">{q.id}. Co znamená „{q.word}“?</div>
              <div className="quiz-options">
                {q.options.map(opt => (
                  <label key={opt} className={`quiz-option ${checked && opt === q.correct ? 'correct' : ''} ${checked && answers[q.id] === opt && opt !== q.correct ? 'wrong' : ''}`}>
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      value={opt}
                      checked={answers[q.id] === opt}
                      onChange={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                      disabled={checked}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
          ))}
          <div className="quiz-actions">
            <button onClick={checkQuiz} disabled={checked}>Vyhodnotit</button>
            {checked && <span className="quiz-score">Skóre: {score}/{questions.length}</span>}
          </div>
        </div>
      )}

      <button onClick={() => (onBack ? onBack() : window.history.back())}>Zpět</button>
    </div>
  )
}
