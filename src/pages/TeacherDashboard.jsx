import { useState, useEffect, useCallback } from 'react'

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
  const [loading, setLoading] = useState(true)
  const [showTemplates, setShowTemplates] = useState(false)
  const [aiInstructions, setAiInstructions] = useState([])
  const [showAiInstructions, setShowAiInstructions] = useState(false)
  const [editingInstruction, setEditingInstruction] = useState(null)
  const [instructionForm, setInstructionForm] = useState({
    instructions: '',
    topicId: null,
    isGlobal: false
  })
  const [instructionLoading, setInstructionLoading] = useState(false)
  const [evaluations, setEvaluations] = useState([])
  const [showEvaluations, setShowEvaluations] = useState(false)
  const [viewingStudents, setViewingStudents] = useState(null)

  const fetchAiInstructions = useCallback(async () => {
    try {
      const res = await fetch(`${api}/api/ai-instructions`, { 
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      setAiInstructions(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to fetch AI instructions:', err)
    }
  }, [api, token])

  const fetchEvaluations = useCallback(async () => {
    try {
      const res = await fetch(`${api}/api/me/evaluations`, { 
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      setEvaluations(data)
    } catch (err) {
      console.error('Failed to fetch evaluations:', err)
    }
  }, [api, token])

  const fetchData = useCallback(async () => {
    setLoading(true)
    const headers = { 'Authorization': `Bearer ${token}` }
    try {
      const [topicsRes, classesRes, templatesRes] = await Promise.all([
        fetch(`${api}/api/topics`, { headers }),
        fetch(`${api}/api/classes`, { headers }),
        fetch(`${api}/api/templates`, { headers }),
      ])

      const classesData = await classesRes.json()
      setClasses(classesData)

      const studentsList = []
      for (const c of classesData) {
        for (const s of c.students || []) {
          if (!studentsList.some(st => st.id === s.id)) {
            studentsList.push(s)
          }
        }
      }
      setStudents(studentsList)

      setTopics(await topicsRes.json())
      setTemplates(await templatesRes.json())

      // Fetch AI instructions & evaluations for this teacher
      await fetchAiInstructions()
      await fetchEvaluations()
    } catch (err) {
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }, [api, token, fetchAiInstructions, fetchEvaluations])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const createTopic = async (e) => {
    e.preventDefault()
    if (!title.trim()) {
      setClassMessageType('error')
      setClassMessage('Zadej prosím název tématu.')
      return
    }

    try {
      const res = await fetch(`${api}/api/topics`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ title, description, level, minMessages }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Nepodařilo se vytvořit téma.')

      setTopics(prev => [data, ...prev])
      setTitle('')
      setDescription('')
      setLevel('A2')
      setMinMessages(10)
      setClassMessageType('success')
      setClassMessage('✅ Téma vytvořeno')
    } catch (err) {
      setClassMessageType('error')
      setClassMessage(err.message)
    }
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

  const applyTemplate = (t) => {
    setTitle(t.title)
    setDescription(t.description)
    setLevel(t.level)
    setShowTemplates(false)
  }

  const saveInstruction = async (e) => {
    e.preventDefault()
    if (!instructionForm.instructions.trim()) return

    setInstructionLoading(true)
    try {
      const method = editingInstruction ? 'PUT' : 'POST'
      const url = editingInstruction 
        ? `${api}/api/ai-instructions/${editingInstruction.id}`
        : `${api}/api/ai-instructions`

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(instructionForm)
      })

      if (!res.ok) throw new Error('Failed to save instruction')

      setClassMessageType('success')
      setClassMessage(editingInstruction ? '✅ AI instrukce aktualizovány' : '✅ AI instrukce uloženy')
      
      // Reset form
      setInstructionForm({ instructions: '', topicId: null, isGlobal: false })
      setEditingInstruction(null)
      
      // Refresh instructions
      await fetchAiInstructions()
    } catch {
      setClassMessageType('error')
      setClassMessage('❌ Chyba při ukládání instrukcí')
    } finally {
      setInstructionLoading(false)
    }
  }

  const editInstruction = (instruction) => {
    setEditingInstruction(instruction)
    setInstructionForm({
      instructions: instruction.instructions,
      topicId: instruction.topic_id,
      isGlobal: instruction.is_global
    })
  }

  const deleteInstruction = async (id) => {
    if (!confirm('Opravdu chcete smazat tyto AI instrukce?')) return

    try {
      const res = await fetch(`${api}/api/ai-instructions/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!res.ok) throw new Error('Failed to delete instruction')

      setClassMessageType('success')
      setClassMessage('✅ AI instrukce smazány')
      
      // Refresh instructions
      await fetchAiInstructions()
    } catch {
      setClassMessageType('error')
      setClassMessage('❌ Chyba při mazání instrukcí')
    }
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
      <div className="teacher-greeting">
        <h1>👋 Ahoj, {user.name}!</h1>
        <p>Spravuj třídy, zadávej úkoly a nastavuj AI instrukce pro své žáky.</p>
      </div>
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
                    <div className="students-header">
                      <strong>Žáci ({cls.students?.length || 0})</strong>
                      <span className="students-actions">
                        <button 
                          className="btn-view-students"
                          onClick={() => setViewingStudents(cls.id)}
                        >
                          👥 Zobrazit žáky
                        </button>
                      </span>
                    </div>
                    {viewingStudents === cls.id ? (
                      <div className="students-list">
                        <h4>👥 {cls.name} - Žáci</h4>
                        <div className="students-grid">
                          {cls.students?.map(s => (
                            <div key={s.id} className="student-card">
                              <div className="student-info">
                                <div className="student-name">{s.name}</div>
                                <div className="student-username">@{s.username}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <button 
                          className="btn-close-students"
                          onClick={() => setViewingStudents(null)}
                        >
                          ✕ Zavřít
                        </button>
                      </div>
                    ) : (
                      <div className="students-list">
                        <h4>👥 {cls.name} - Žáci</h4>
                        <div className="students-grid">
                          {cls.students?.map(s => (
                            <div key={s.id} className="student-card">
                              <div className="student-info">
                                <div className="student-name">{s.name}</div>
                                <div className="student-username">@{s.username}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <button 
                          className="btn-close-students"
                          onClick={() => setViewingStudents(null)}
                        >
                          ✕ Zavřít
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="section">
        <div className="section-header">
          <h2>🤖 AI Instrukce</h2>
          <button 
            className="btn-toggle" 
            onClick={() => setShowAiInstructions(!showAiInstructions)}
          >
            {showAiInstructions ? '✕ Skrýt' : '📝 Spravovat instrukce'}
          </button>
        </div>

        {showAiInstructions && (
          <div className="ai-instructions-container">
            <div className="instruction-form-container">
              <h3>{editingInstruction ? 'Upravit instrukce' : 'Nové AI instrukce'}</h3>
              <form className="topic-form" onSubmit={saveInstruction}>
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={instructionForm.isGlobal}
                      onChange={e => setInstructionForm(prev => ({
                        ...prev,
                        isGlobal: e.target.checked,
                        topicId: e.target.checked ? null : prev.topicId
                      }))}
                    />
                    Globální instrukce (pro všechna témata)
                  </label>
                </div>

                {!instructionForm.isGlobal && (
                  <div className="form-group">
                    <label>Specifické téma (nepovinné)</label>
                    <select
                      value={instructionForm.topicId || ''}
                      onChange={e => setInstructionForm(prev => ({
                        ...prev,
                        topicId: e.target.value ? Number(e.target.value) : null
                      }))}
                    >
                      <option value="">-- Všechna témata --</option>
                      {topics.map(t => (
                        <option key={t.id} value={t.id}>{t.title}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label>AI instrukce</label>
                  <textarea
                    placeholder="Zadejte instrukce pro AI... Např: 'Zaměř se na konverzaci o každodenním životě, používej jednoduché věty a opravuj chyby v gramatice.'"
                    value={instructionForm.instructions}
                    onChange={e => setInstructionForm(prev => ({
                      ...prev,
                      instructions: e.target.value
                    }))}
                    rows={4}
                    required
                  />
                </div>

                <div className="form-actions">
                  <button type="submit" disabled={instructionLoading}>
                    {instructionLoading ? 'Ukládám...' : (editingInstruction ? 'Aktualizovat' : 'Uložit')}
                  </button>
                  {editingInstruction && (
                    <button 
                      type="button" 
                      onClick={() => {
                        setEditingInstruction(null)
                        setInstructionForm({ instructions: '', topicId: null, isGlobal: false })
                      }}
                    >
                      Zrušit
                    </button>
                  )}
                </div>
              </form>
            </div>

            {aiInstructions.length > 0 && (
              <div className="instructions-list">
                <h3>Uložené instrukce</h3>
                {aiInstructions.map(instruction => (
                  <div key={instruction.id} className="instruction-card">
                    <div className="instruction-header">
                      <span className="instruction-type">
                        {instruction.is_global ? '🌍 Globální' : `📚 ${instruction.topic_title || 'Neznámé téma'}`}
                      </span>
                      <div className="instruction-actions">
                        <button onClick={() => editInstruction(instruction)}>✏️</button>
                        <button onClick={() => deleteInstruction(instruction.id)}>🗑️</button>
                      </div>
                    </div>
                    <div className="instruction-content">
                      {instruction.instructions}
                    </div>
                    <div className="instruction-meta">
                      Aktualizováno: {new Date(instruction.updated_at).toLocaleDateString('cs-CZ')}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {aiInstructions.length === 0 && (
              <div className="empty-state">
                <p>Ještě nemáte žádné AI instrukce.</p>
                <p>Vytvořte globální instrukce nebo instrukce pro konkrétní témata.</p>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="section">
        <div className="section-header">
          <h2>📊 Hodnocení studentů</h2>
          <button 
            className="btn-toggle" 
            onClick={() => setShowEvaluations(!showEvaluations)}
          >
            {showEvaluations ? '✕ Skrýt' : '📈 Zobrazit hodnocení'}
          </button>
        </div>

        {showEvaluations && (
          <div className="evaluations-container">
            <div className="evaluations-summary">
              <h3>📈 Statistiky hodnocení</h3>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-number">{evaluations.length}</div>
                  <div className="stat-label">Celkem hodnocení</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">
                    {evaluations.length > 0 ? 
                      (evaluations.reduce((sum, e) => sum + (e.score || 0), 0) / evaluations.length).toFixed(1) : 
                      '0'
                    }
                  </div>
                  <div className="stat-label">Průměrné skóre</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">
                    {evaluations.length > 0 ? 
                      (evaluations.reduce((sum, e) => sum + (e.grade || 0), 0) / evaluations.length).toFixed(1) : 
                      '0'
                    }
                  </div>
                  <div className="stat-label">Průměrná známka</div>
                </div>
              </div>
            </div>

            {evaluations.length > 0 && (
              <div className="evaluations-list">
                <h3>📝 Poslední hodnocení</h3>
                {evaluations.slice(0, 10).map(evaluation => (
                  <div key={evaluation.id} className="evaluation-card">
                    <div className="evaluation-header">
                      <span className="evaluation-topic">{evaluation.topic}</span>
                      <span className="evaluation-date">
                        {new Date(evaluation.created_at).toLocaleDateString('cs-CZ')}
                      </span>
                    </div>
                    {evaluation.student_name && (
                      <div className="evaluation-student">
                        <span className="student-badge">Student: {evaluation.student_name}</span>
                      </div>
                    )}
                    <div className="evaluation-scores">
                      <span className="score-badge">Skóre: {evaluation.score}/10</span>
                      <span className="grade-badge">Známka: {evaluation.grade}/5</span>
                    </div>
                    <div className="evaluation-content">
                      {evaluation.evaluation}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {evaluations.length === 0 && (
              <div className="empty-state">
                <p>Zatím žádná hodnocení.</p>
                <p>Hodnocení studentů se zobrazí zde po jejich dokončení konverzací.</p>
              </div>
            )}
          </div>
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
              <div key={i} className="template-card" onClick={() => applyTemplate(t)}>
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
