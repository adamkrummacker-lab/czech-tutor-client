import { useState, useEffect } from 'react'

export default function StudentDashboard({ api, user, token, authHeaders, onOpenChat, onOpenFinalTest, t }) {
  const [topics, setTopics] = useState([])
  const [gamification, setGamification] = useState({ xp: 0, streak: 0, badges: [], allBadges: [] })
  const [classInfo, setClassInfo] = useState(null)
  const [leaderboard, setLeaderboard] = useState({ entries: [], class: null })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [version, setVersion] = useState(Date.now())
  const tr = t || ((key, vars) => key)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setLoadError(null)
      const headers = { 'Authorization': `Bearer ${token}` }
      try {
        const [t, c, lb] = await Promise.all([
          fetch(`${api}/api/topics`, { headers }).then(r => r.json()),
          fetch(`${api}/api/classes/me`, { headers }).then(r => r.json()),
          fetch(`${api}/api/leaderboard`, { headers }).then(r => r.json()),
        ])
        setTopics(t)
        setClassInfo(c)
        // Set default gamification data
        setGamification({ xp: 0, streak: 0, badges: [], allBadges: [] })
        setLeaderboard(lb)
      } catch (err) {
        setLoadError(tr('student_load_error'))
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) return <div className="loading">{tr('student_loading')}</div>
  if (loadError) return <div className="loading">⚠️ {loadError}</div>

  const cardColors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444']
  const cardEmojis = ['📖', '🗣️', '🎯', '🌟', '🎭', '📝']
  const xpLevel = gamification.xp < 100
    ? tr('student_level_newbie')
    : gamification.xp < 300
      ? tr('student_level_beginner')
      : gamification.xp < 600
        ? tr('student_level_intermediate')
        : tr('student_level_expert')
  const xpProgress = Math.min((gamification.xp % 100) / 100 * 100, 100)
  const weeklyGoal = 2
  const completedLessons = topics.filter(t => t.submitted_at).length
  const inProgressLessons = topics.filter(t => !t.submitted_at).length
  const goalProgress = Math.min((completedLessons / weeklyGoal) * 100, 100)
  const nextTopic = topics.find(t => !t.submitted_at)
  const motivation = completedLessons >= weeklyGoal
    ? tr('student_weekly_done')
    : tr('student_weekly_left', { left: weeklyGoal - completedLessons })

  return (
    <div className="dashboard student-dashboard">
      <div className="student-greeting">
        <h1>{tr('student_greeting_title', { name: user.name })}</h1>
        <p>{tr('student_greeting')}</p>
      </div>
      {classInfo?.class ? (
        <div className="student-class">
          <p>{tr('student_class_info', { className: classInfo.class.name, teacherName: classInfo.class.teacher_name })}</p>
        </div>
      ) : (
        <div className="student-class">
          <p>{tr('student_no_class')}</p>
        </div>
      )}

      {leaderboard?.entries?.length > 0 && (
        <div className="leaderboard">
          <div className="leaderboard-header">
            <h3>{tr('student_leaderboard_title', { className: leaderboard.class?.name ? ` · ${leaderboard.class.name}` : '' })}</h3>
            <span>{tr('student_leaderboard_top', { count: leaderboard.entries.length })}</span>
          </div>
          <div className="leaderboard-list">
            {leaderboard.entries.map((entry, idx) => (
              <div key={entry.id} className={`leaderboard-row ${entry.id === user.id ? 'me' : ''}`}>
                <div className="leaderboard-rank">{idx + 1}.</div>
                <div className="leaderboard-name">
                  <span>{entry.name}</span>
                  {Array.isArray(entry.achievements) && entry.achievements.length > 0 && (
                    <span className="leaderboard-achievements">
                      {entry.achievements.map(a => (
                        <span key={a.key} className="leaderboard-achievement" title={a.name}>
                          {a.emoji}
                        </span>
                      ))}
                    </span>
                  )}
                </div>
                <div className="leaderboard-stats">
                  <span>⭐ {entry.xp} XP</span>
                  <span>🔥 {entry.streak}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="learning-goals">
        <div className="goal-card">
          <div className="goal-header">
            <h3>{tr('student_weekly_goal')}</h3>
            <span>{tr('student_weekly_progress', { completed: completedLessons, goal: weeklyGoal })}</span>
          </div>
          <div className="goal-progress">
            <div className="goal-fill" style={{ width: `${goalProgress}%` }}></div>
          </div>
          <p className="goal-message">{motivation}</p>
        </div>
        <div className="goal-card goal-next">
          <div className="goal-header">
            <h3>{tr('student_next_step')}</h3>
          </div>
          {nextTopic ? (
            <p>{tr('student_next_topic', { title: nextTopic.title })}</p>
          ) : (
            <p>{tr('student_all_done')}</p>
          )}
          <div className="lesson-pills">
            <span className="lesson-pill">{tr('student_in_progress', { count: inProgressLessons })}</span>
            <span className="lesson-pill">{tr('student_done', { count: completedLessons })}</span>
          </div>
        </div>
      </div>

      {/* Gamification Bar */}
      <div className="gamification-bar">
        <div className="xp-section">
          <div className="xp-label">{tr('student_xp_label', { xp: gamification.xp, level: xpLevel })}</div>
          <div className="xp-bar"><div className="xp-fill" style={{ width: `${xpProgress}%` }}></div></div>
        </div>
        <div className="streak-section">
          <span className="streak-fire">{gamification.streak > 0 ? '🔥' : '❄️'}</span>
          <span className="streak-count">{gamification.streak}</span>
          <span className="streak-label">{tr('student_streak_days')}</span>
        </div>
      </div>

      {/* Badges */}
      <div className="badges-section">
        <h3>{tr('student_badges_title')}</h3>
        <div className="badges-grid">
          {gamification.allBadges.map(b => (
            <div key={b.key} className={`badge-card ${b.earned ? 'earned' : 'locked'}`} title={b.desc}>
              <div className="badge-emoji">{b.earned ? b.emoji : '🔒'}</div>
              <div className="badge-name">{b.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Topics */}
      <section className="section">
        <h2>{tr('student_conversations_title')}</h2>
        {topics.length === 0 && (
          <div className="empty-state fun-empty">
            <div className="empty-emoji">🕐</div>
            <p>{tr('student_no_topics_title')}</p>
            <p>{tr('student_no_topics_body1')}</p>
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
                  <>
                    <span className="submitted-dot"></span> {tr('student_submitted')}
                    <button
                      className="btn-finaltest"
                      onClick={(e) => {
                        e.stopPropagation()
                        onOpenFinalTest && onOpenFinalTest(topic)
                      }}
                    >
                      {tr('student_final_test')}
                    </button>
                  </>
                ) : (
                  <>
                    <span className="pulse-dot"></span>{' '}
                    {topic.messageCount > 0
                      ? tr('student_continue', { count: topic.messageCount, total: topic.min_messages || 10 })
                      : tr('student_start_convo')}
                    {' '}→
                  </>
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
