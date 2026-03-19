import { useState, useEffect } from 'react'

export default function StudentDashboard({ api, user, token, authHeaders, onOpenChat }) {
  const [topics, setTopics] = useState([])
  const [gamification, setGamification] = useState({ xp: 0, streak: 0, badges: [], allBadges: [] })
  const [classInfo, setClassInfo] = useState(null)
  const [lectures, setLectures] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setLoadError(null)
      const headers = { 'Authorization': `Bearer ${token}` }
      try {
        const [t, g, c, l] = await Promise.all([
          fetch(`${api}/api/topics`, { headers }).then(r => r.json()),
          fetch(`${api}/api/gamification`, { headers }).then(r => r.json()),
          fetch(`${api}/api/classes/me`, { headers }).then(r => r.json()),
          fetch(`${api}/api/my-lectures`, { headers }).then(r => r.json()),
        ])
        setTopics(t)
        setGamification(g)
        setClassInfo(c)
        setLectures(l)
      } catch (err) {
        setLoadError('Chyba při načítání dat. Zkus stránku obnovit.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) return <div className="loading">⏳ Načítání...</div>
  if (loadError) return <div className="loading">⚠️ {loadError}</div>

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
              <div className="badge-emoji">{b.earned ? b.emoji : '🔒'}</div>
              <div className="badge-name">{b.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Assigned Lectures */}
      <div className="lectures-section">
        <h3>📚 Přiřazené přednášky</h3>
        {lectures.length === 0 ? (
          <div className="empty-state">
            <p>📚 Zatím nemáte žádné přiřazené přednášky.</p>
            <p>Tvoji učitelé ti zde brzy přiřadí studijní materiály.</p>
          </div>
        ) : (
          <div className="lectures-list">
            {lectures.map(lecture => (
              <div key={lecture.id} className="lecture-card">
                <div className="lecture-header">
                  <h4>{lecture.title}</h4>
                  {lecture.topic_title && (
                    <span className="lecture-topic">📚 {lecture.topic_title}</span>
                  )}
                </div>
                <div className="lecture-content">
                  {lecture.content}
                </div>
                <div className="lecture-meta">
                  Přiřazeno: {new Date(lecture.created_at).toLocaleDateString('cs-CZ')}
                </div>
              </div>
            ))}
          </div>
        )}
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
