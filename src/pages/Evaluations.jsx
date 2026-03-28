import { useEffect, useState } from 'react'

export default function Evaluations({ api, authHeaders }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const res = await fetch(`${api}/api/me/evaluations`, { headers: authHeaders() })
        const data = await res.json()
        setRows(data)
      } finally {
        setLoading(false)
      }
    }
    fetchData().catch(() => setLoading(false))
  }, [])

  const avgScore = rows.length ? (rows.reduce((sum, r) => sum + (r.score || 0), 0) / rows.length).toFixed(1) : null
  const avgGrade = rows.length ? (rows.reduce((sum, r) => sum + (r.grade || 0), 0) / rows.length).toFixed(1) : null

  return (
    <div className="evaluations-page">
      <h2>📌 Moje hodnocení</h2>
      {loading && <p>Načítám…</p>}
      {!loading && rows.length === 0 && <p>Zatím žádné hodnocení.</p>}
      {!loading && rows.length > 0 && (
        <>
          <div className="evaluation-summary">
            <div>Průměrné skóre: {avgScore}</div>
            <div>Průměrná známka: {avgGrade}</div>
            <div>Počet hodnocení: {rows.length}</div>
          </div>

          <table className="evaluations-table">
            <thead>
              <tr>
                <th>Datum</th>
                <th>Téma</th>
                <th>Skóre</th>
                <th>Test</th>
                <th>Známka</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td>{new Date(r.created_at).toLocaleString('cs-CZ', { dateStyle: 'short', timeStyle: 'short' })}</td>
                  <td>{r.topic}</td>
                  <td>{r.score ?? '-'}</td>
                  <td>{r.quiz_score != null && r.quiz_total ? `${r.quiz_score}/${r.quiz_total}` : '-'}</td>
                  <td>{r.grade ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}
