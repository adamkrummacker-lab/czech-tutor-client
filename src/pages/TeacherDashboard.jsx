import { useState, useEffect } from 'react'

export default function TeacherDashboard({ api, user, token, authHeaders, onOpenChat }) {
  const [topics, setTopics] = useState([])
  const [classes, setClasses] = useState([])
  const [students, setStudents] = useState([])
  const [templates, setTemplates] = useState([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [level, setLevel] = useState('A2')
  const [minMessages, setMinMessages] = useState(10)
  const [newClassName, setNewClassName] = useState('')
  const [creatingClass, setCreatingClass] = useState(false)
  const [classMessage, setClassMessage] = useState(null)
  const [classMessageType, setClassMessageType] = useState('success')
  const [copiedCode, setCopiedCode] = useState(null)
  const [inviteName, setInviteName] = useState('')
  const [inviteClassId, setInviteClassId] = useState(null)
  const [inviteResult, setInviteResult] = useState(null)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showTemplates, setShowTemplates] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    const headers = { 'Authorization': `Bearer ${token}` }
    const [topicsRes, classesRes, templatesRes] = await Promise.all([
      fetch(`${api}/api/topics`, { headers }),
      fetch(`${api}/api/classes`, { headers }),
      fetch(`${api}/api/templates`, { headers }),
    ])
    const classesData = await classesRes.json()
    setClasses(classesData)
    if (classesData.length > 0 && !inviteClassId) setInviteClassId(classesData[0].id)
    const studentsList = []
    for (const c of classesData) {
      for (const s of c.students || []) {
        if (!studentsList.some(st => st.id === s.id)) studentsList.push(s)
      }
    }
    setStudents(studentsList)
    setTopics(await topicsRes.json())
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

  const createClass = async (e) => {
    e.preventDefault()
    if (!newClassName.trim()) {
      setClassMessageType('error')
      setClassMessage('Zadej prosím název třídy.')
      return
    }

    setCreatingClass(true)
    setClassMessage(null)

    try {
      const res = await fetch(`${api}/api/classes`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ name: newClassName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Nepodařilo se vytvořit třídu.')

      setClassMessageType('success')
      setClassMessage(`✅ Třída „${data.name}“ vytvořena! Kód je ${data.join_code}.`)
      setNewClassName('')
      fetchData()
    } catch (err) {
      setClassMessageType('error')
      setClassMessage(err.message)
    } finally {
      setCreatingClass(false)
    }
  }

  const inviteStudent = async (e) => {
    e.preventDefault()
    if (!inviteName.trim()) {
      setClassMessageType('error')
      setClassMessage('Zadej prosím jméno žáka.')
      return
    }
    if (!inviteClassId) {
      setClassMessageType('error')
      setClassMessage('Vyber třídu.')
      return
    }

    setInviteLoading(true)
    setInviteResult(null)
    setClassMessage(null)

    try {
      const res = await fetch(`${api}/api/students/invite`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ name: inviteName, classId: inviteClassId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Nepodařilo se pozvat žáka.')

      setInviteResult(data)
      setInviteName('')
      setClassMessageType('success')
      setClassMessage(`✅ Žák pozván: ${data.username}`)
    } catch (err) {
      setClassMessageType('error')
      setClassMessage(err.message)
    } finally {
      setInviteLoading(false)
    }
  }

  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch {
      setClassMessageType('error')
      setClassMessage('Nelze zkopírovat do schránky.')
    }
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
        <h2>🏫 Moje třídy</h2>
        <form className="topic-form" onSubmit={createClass} style={{ marginBottom: '1rem' }}>
          <input
            type="text"
            placeholder="Název nové třídy (např. 3.B)"
            value={newClassName}
            onChange={e => setNewClassName(e.target.value)}
          />
          <button type="submit" disabled={creatingClass}>
            {creatingClass ? '...' : '✅ Vytvořit třídu'}
          </button>
        </form>

        {classMessage && (
          <div className={`alert ${classMessageType === 'error' ? 'alert-error' : 'alert-success'}`}>
            {classMessage}
          </div>
        )}

        {classes.length === 0 ? (
          <p className="empty">Zatím nemáš žádné třídy. Vytvoř jednu a pošli žákům kód.</p>
        ) : (
          <>
            <div className="invite-card">
              <h3>📩 Pozvat žáka</h3>
              <p className="small-note">Uživatel dostane své přihlašovací údaje, které může použít místo kódu.</p>
              <form className="settings-form" onSubmit={inviteStudent}>
                <label className="field-row">
                  <span>Vyber třídu</span>
                  <select value={inviteClassId || ''} onChange={e => setInviteClassId(Number(e.target.value))}>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </label>
                <label className="field-row">
                  <span>Jméno žáka</span>
                  <input
                    value={inviteName}
                    onChange={e => setInviteName(e.target.value)}
                    placeholder="Např. Jan Novák"
                  />
                </label>
                <button type="submit" disabled={inviteLoading}>
                  {inviteLoading ? 'Posílám…' : '✅ Pozvat žáka'}
                </button>
              </form>
              {inviteResult && (
                <div className="alert alert-success" style={{ marginTop: '0.75rem' }}>
                  <p>✅ Žák vytvořen:</p>
                  <p><strong>Uživatel:</strong> {inviteResult.username}</p>
                  <p><strong>Heslo:</strong> {inviteResult.password}</p>
                  <p><small>Pošlete mu tyto údaje (může je změnit v Nastavení).</small></p>
                </div>
              )}
            </div>

            <div className="class-list">
              {classes.map(cls => (
                <div key={cls.id} className="class-card">
                  <div className="class-header">
                    <h3>{cls.name}</h3>
                    <div className="class-code">
                      <span>Kód: <strong>{cls.join_code}</strong></span>
                      <button
                        type="button"
                        className="btn-copy"
                        onClick={() => copyCode(cls.join_code)}
                      >
                        {copiedCode === cls.join_code ? '✅ Zkopírováno' : '📋 Kopírovat'}
                      </button>
                    </div>
                  </div>
                  <div className="class-students">
                    <strong>Žáci ({cls.students?.length || 0}):</strong>
                    {cls.students?.length ? (
                      <ul>
                        {cls.students.map(s => (
                          <li key={s.id}>{s.name} ({s.username})</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="empty">Žádní žáci zatím.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

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
