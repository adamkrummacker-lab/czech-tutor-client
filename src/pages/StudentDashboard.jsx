import { useState, useEffect } from 'react'

export default function StudentDashboard({ api, user, token, authHeaders, onOpenChat }) {
  const [topics, setTopics] = useState([])
  const [gamification, setGamification] = useState({ xp: 0, streak: 0, badges: [], allBadges: [] })
  const [classInfo, setClassInfo] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const headers = { 'Authorization': `Bearer ${token}` }
    Promise.all([
      fetch(`${api}/api/topics`, { headers }).then(r => r.json()),
      fetch(`${api}/api/gamification`, { headers }).then(r => r.json()),
      fetch(`${api}/api/classes/me`, { headers }).then(r => r.json()),
    ]).then(([t, g, c]) => {
      setTopics(t)
      setGamification(g)
      setClassInfo(c)
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="loading">⏳ Načítání...</div>

  const cardColors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444']
  const cardEmojis = ['📖', '🗣️', '🎯', '🌟', '🎭', '📝']
  const xpLevel = gamification.xp < 100 ? 'Nováček' : gamification.xp < 300 ? 'Začátečník' : gamification.xp < 600 ? 'Pokročilý' : 'Expert'
  const xpProgress = Math.min((gamification.xp % 100) / 100 * 100, 100)

  return (
    <div className="dashboard student-dashboard">
      <div className="student-greeting">
        <h1>👋 Ahoj, {user.name}!</h1>
        <p>Procvičuj češtinu s AI lektorem 🤖</p>
      </div>
      {classInfo?.class ? (
        <div className="student-class">
          <p>🏫 Třída: <strong>{classInfo.class.name}</strong> · Učitel: {classInfo.class.teacher_name}</p>
        </div>
      ) : (
        <div className="student-class">
          <p>⚠️ Nejsi zatím přiřazen do žádné třídy. Zeptej se učitele na kód nebo ho zadej v Nastavení.</p>
        </div>
      )}

      {/* Gamification Bar */}
      <div className="gamification-bar">
        <div className="xp-section">
          <div className="xp-label">⭐ {gamification.xp} XP · {xpLevel}</div>
          <div className="xp-bar"><div className="xp-fill" style={{ width: `${xpProgress}%` }}></div></div>
        </div>
        <div className="streak-section">
          <span className="streak-fire">{gamification.streak > 0 ? '🔥' : '❄️'}</span>
          <span className="streak-count">{gamification.streak}</span>
          <span className="streak-label">dní v řadě</span>
        </div>
      </div>

      {/* Badges */}
      <div className="badges-section">
        <h3>🏆 Odznaky</h3>
        <div className="badges-grid">
          {gamification.allBadges.map(b => (
            <div key={b.key} className={`badge-card ${b.earned ? 'earned' : 'locked'}`} title={b.desc}>
              <span className="badge-emoji">{b.emoji}</span>
              <span className="badge-name">{b.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Topics */}
      <section className="section">
        <h2>🎮 Moje konverzace</h2>
        {topics.length === 0 && (
          <div className="empty-state fun-empty">
            <div className="empty-emoji">🕐</div>
            <p>Žádná témata zatím nemáš.</p>
            <p>Počkej, až ti učitel něco zadá! 📚</p>
          </div>
        )}
        <div className="student-topic-grid">
          {topics.map((topic, idx) => (
            <div
              key={topic.id}
              className="student-topic-card"
              style={{ '--card-color': cardColors[idx % cardColors.length] }}
              onClick={() => onOpenChat(topic)}
            >
              <div className="student-card-top">
                <div className="student-card-emoji">{cardEmojis[idx % cardEmojis.length]}</div>
                <span className="level-pill">{topic.level}</span>
              </div>
              <h3>{topic.title}</h3>
              {topic.description && <p className="student-card-desc">{topic.description}</p>}
              <div className="student-card-action">
                {topic.submitted_at ? (
                  <><span className="submitted-dot"></span> Odevzdáno ✅</>
                ) : (
                  <><span className="pulse-dot"></span> {topic.messageCount > 0 ? `Pokračovat (${topic.messageCount}/${topic.min_messages || 10})` : 'Začít konverzaci'} →</>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="student-tips">
        <h3>💡 Tipy pro učení</h3>
        <div className="tips-grid">
          <div className="tip-card">🎙️ <strong>Mluv nahlas</strong> – v chatu můžeš používat mikrofon</div>
          <div className="tip-card">🔊 <strong>Poslouchej</strong> – klikni na 🔊 u odpovědi AI</div>
          <div className="tip-card">📖 <strong>Slovníček</strong> – klikni na slovo v odpovědi a ulož si ho</div>
          <div className="tip-card">✏️ <strong>Neboj se chyb</strong> – AI tě jemně opraví (+5 XP za zprávu!)</div>
        </div>
      </div>
    </div>
  )
}
