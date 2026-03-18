import { useState, useEffect } from 'react'

export default function TeacherDashboard({ api, user, token, authHeaders, onOpenChat }) {
  const [topics, setTopics] = useState([])
  const [students, setStudents] = useState([])
  const [templates, setTemplates] = useState([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [level, setLevel] = useState('A2')
  const [minMessages, setMinMessages] = useState(10)
  const [loading, setLoading] = useState(true)
  const [showTemplates, setShowTemplates] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    const headers = { 'Authorization': `Bearer ${token}` }
    const [topicsRes, studentsRes, templatesRes] = await Promise.all([
      fetch(`${api}/api/topics`, { headers }),
      fetch(`${api}/api/students`, { headers }),
      fetch(`${api}/api/templates`, { headers }),
    ])
    setTopics(await topicsRes.json())
    setStudents(await studentsRes.json())
    setTemplates(await templatesRes.json())
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const createTopic = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    await fetch(`${api}/api/topics`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ title, description, level, minMessages }),
    })
    setTitle('')
    setDescription('')
    setLevel('A2')
    setMinMessages(10)
    fetchData()
  }

  const useTemplate = (t) => {
    setTitle(t.title)
    setDescription(t.description)
    setLevel(t.level)
    setShowTemplates(false)
  }

  const assignTopic = async (topicId, studentId) => {
    await fetch(`${api}/api/topics/${topicId}/assign`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ studentId }),
    })
    fetchData()
  }

  const deleteTopic = async (topicId) => {
    if (!confirm('Opravdu smazat téma?')) return
    await fetch(`${api}/api/topics/${topicId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } })
    fetchData()
  }

  const exportChat = (topicId, studentId) => {
    window.open(`${api}/api/chat/${topicId}/export?studentId=${studentId}&token=${token}`, '_blank')
  }

  if (loading) return <div className="loading">Načítání...</div>

  return (
    <div className="dashboard">
      <section className="section">
        <h2>📝 Vytvořit nové téma</h2>
        <button className="btn-templates" onClick={() => setShowTemplates(!showTemplates)}>
          {showTemplates ? '✕ Zavřít' : '📋 Použít šablonu'}
        </button>

        {showTemplates && (
          <div className="templates-grid">
            {templates.map((t, i) => (
              <div key={i} className="template-card" onClick={() => useTemplate(t)}>
                <div className="template-level">{t.level}</div>
                <h4>{t.title}</h4>
                <p>{t.description}</p>
              </div>
            ))}
          </div>
        )}

        <form className="topic-form" onSubmit={createTopic}>
          <input
            type="text"
            placeholder="Název tématu (např. V restauraci)"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
          />
          <textarea
            placeholder="Popis zadání pro žáka..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
          />
          <div className="level-select">
            <label>Úroveň:</label>
            {['A1', 'A2', 'B1', 'B2', 'C1'].map(l => (
              <button
                key={l}
                type="button"
                className={`btn-level ${level === l ? 'active' : ''}`}
                onClick={() => setLevel(l)}
              >
                {l}
              </button>
            ))}
          </div>
          <div className="min-messages-select">
            <label>Počet zpráv:</label>
            <input type="number" min="3" max="50" value={minMessages} onChange={e => setMinMessages(Number(e.target.value))} />
            <span className="min-msg-hint">zpráv k odevzdání</span>
          </div>
          <button type="submit">✅ Vytvořit téma</button>
        </form>
      </section>

      <section className="section">
        <h2>📚 Témata ({topics.length})</h2>
        {topics.length === 0 && <p className="empty">Zatím žádná témata. Vytvořte první!</p>}
        <div className="topic-list">
          {topics.map(topic => (
            <div key={topic.id} className="topic-card">
              <div className="topic-header">
                <h3>{topic.title}</h3>
                <div className="topic-header-right">
                  <span className="badge level-badge">{topic.level}</span>
                  <span className="badge">{topic.assignedTo.length} žáků</span>
                  <button className="btn-delete" onClick={() => deleteTopic(topic.id)}>🗑️</button>
                </div>
              </div>
              {topic.description && <p className="topic-desc">{topic.description}</p>}
              <div className="topic-actions">
                <div className="assign-row">
                  <span>Přiřadit:</span>
                  {students.map(s => (
                    <button
                      key={s.id}
                      className={`btn-assign ${topic.assignedTo.includes(s.id) ? 'assigned' : ''}`}
                      onClick={() => assignTopic(topic.id, s.id)}
                      disabled={topic.assignedTo.includes(s.id)}
                    >
                      {s.name} {topic.assignedTo.includes(s.id) ? '✓' : '+'}
                    </button>
                  ))}
                </div>
                {topic.assignedTo.length > 0 && (
                  <div className="view-chats">
                    <span>Chat:</span>
                    {students.filter(s => topic.assignedTo.includes(s.id)).map(s => (
                      <span key={s.id} className="chat-actions-group">
                        <button className="btn-view" onClick={() => onOpenChat(topic, s)}>
                          {topic.submissions?.[s.id] ? '✅' : '👁️'} {s.name}
                        </button>
                        <button className="btn-export" onClick={() => exportChat(topic.id, s.id)}>📥</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
