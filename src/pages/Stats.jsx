import { useState, useEffect } from 'react'

export default function Stats({ api, user, token, authHeaders }) {
  const [stats, setStats] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${api}/api/stats`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { setStats(data); setLoading(false) })
  }, [])

  if (loading) return <div className="loading">⏳ Načítání...</div>

  return (
    <div className="stats-page">
      <h2>📊 Statistiky žáků</h2>

      {stats.length === 0 && (
        <div className="empty-state">
          <p>Zatím nejsou žádní registrovaní žáci.</p>
        </div>
      )}

      <div className="stats-grid">
        {stats.map(s => (
          <div key={s.id} className="stat-card">
            <div className="stat-header">
              <h3>🧑‍🎓 {s.name}</h3>
              <span className="stat-username">@{s.username}</span>
            </div>
            <div className="stat-metrics">
              <div className="stat-metric">
                <span className="stat-value">{s.msgCount}</span>
                <span className="stat-label">zpráv</span>
              </div>
              <div className="stat-metric">
                <span className="stat-value">{s.topicCount}</span>
                <span className="stat-label">témat</span>
              </div>
              <div className="stat-metric">
                <span className="stat-value">⭐ {s.xp}</span>
                <span className="stat-label">XP</span>
              </div>
              <div className="stat-metric">
                <span className="stat-value">🔥 {s.streak}</span>
                <span className="stat-label">streak</span>
              </div>
              <div className="stat-metric">
                <span className="stat-value">📖 {s.vocabCount}</span>
                <span className="stat-label">slovíček</span>
              </div>
              <div className="stat-metric">
                <span className="stat-value">🏆 {s.badgeCount}</span>
                <span className="stat-label">odznaků</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
