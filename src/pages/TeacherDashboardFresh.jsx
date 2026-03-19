import { useState, useEffect } from 'react'

export default function TeacherDashboardFresh({ api, user, token, authHeaders, onOpenChat }) {
  const [loading, setLoading] = useState(true)
  const [classes, setClasses] = useState([])
  const [topics, setTopics] = useState([])
  const [lectures, setLectures] = useState([])
  const [showLectures, setShowLectures] = useState(false)
  const [lectureForm, setLectureForm] = useState({
    title: '',
    content: '',
    topicId: null
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = { 'Authorization': `Bearer ${token}` }
        const [classesRes, topicsRes, lecturesRes] = await Promise.all([
          fetch(`${api}/api/classes`, { headers }),
          fetch(`${api}/api/topics`, { headers }),
          fetch(`${api}/api/lectures`, { headers }),
        ])
        
        setClasses(await classesRes.json())
        setTopics(await topicsRes.json())
        setLectures(await lecturesRes.json())
      } catch (err) {
        console.error('Error:', err)
      }
      setLoading(false)
    }

    fetchData()
  }, [api, token])

  const createLecture = async (e) => {
    e.preventDefault()
    if (!lectureForm.title.trim() || !lectureForm.content.trim()) return

    try {
      const res = await fetch(`${api}/api/lectures`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(lectureForm)
      })

      if (!res.ok) throw new Error('Failed to create lecture')

      const data = await res.json()
      setLectures(prev => [data, ...prev])
      setLectureForm({ title: '', content: '', topicId: null })
    } catch (err) {
      console.error('Error creating lecture:', err)
    }
  }

  const deleteLecture = async (id) => {
    if (!confirm('Opravdu chcete smazat tuto přednášku?')) return

    try {
      const res = await fetch(`${api}/api/lectures/${id}`, {
        method: 'DELETE',
        headers: authHeaders()
      })

      if (!res.ok) throw new Error('Failed to delete lecture')

      setLectures(prev => prev.filter(l => l.id !== id))
    } catch (err) {
      console.error('Error deleting lecture:', err)
    }
  }

  if (loading) {
    return <div className="loading">Načítám...</div>
  }

  return (
    <div className="dashboard">
      <h1>🎓 Teacher Dashboard - Fresh Version</h1>
      
      <section className="section">
        <div className="section-header">
          <h2>📚 Přednášky</h2>
          <button 
            className="btn-toggle" 
            onClick={() => setShowLectures(!showLectures)}
          >
            {showLectures ? '✕ Skrýt' : '📝 Přidat přednášku'}
          </button>
        </div>

        {showLectures && (
          <div className="lecture-form">
            <h3>📝 Nová přednáška</h3>
            <form onSubmit={createLecture}>
              <div className="form-group">
                <label>Název přednášky</label>
                <input
                  type="text"
                  value={lectureForm.title}
                  onChange={e => setLectureForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Např. 'Úvod do českého jazyka'"
                  required
                />
              </div>
              <div className="form-group">
                <label>Téma (volitelné)</label>
                <select
                  value={lectureForm.topicId}
                  onChange={e => setLectureForm(prev => ({ ...prev, topicId: e.target.value }))}
                >
                  <option value="">-- Žádné téma --</option>
                  {topics.map(topic => (
                    <option key={topic.id} value={topic.id}>
                      {topic.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Obsah přednášky</label>
                <textarea
                  value={lectureForm.content}
                  onChange={e => setLectureForm(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Zadejte obsah přednášky..."
                  rows={6}
                  required
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  📝 Vytvořit přednášku
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="lectures-list">
          <h3>📚 Moje přednášky</h3>
          {lectures.length === 0 ? (
            <p className="empty">Zatím nemáte žádné přednášky.</p>
          ) : (
            lectures.map(lecture => (
              <div key={lecture.id} className="lecture-card">
                <div className="lecture-header">
                  <h4>{lecture.title}</h4>
                  {lecture.topic_title && (
                    <span className="lecture-topic">📚 {lecture.topic_title}</span>
                  )}
                  <button 
                    className="btn-delete"
                    onClick={() => deleteLecture(lecture.id)}
                  >
                    🗑️ Smazat
                  </button>
                </div>
                <div className="lecture-content">
                  {lecture.content}
                </div>
                <div className="lecture-meta">
                  Vytvořeno: {new Date(lecture.created_at).toLocaleDateString('cs-CZ')}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="section">
        <h2>🏫 Třídy</h2>
        {classes.length === 0 ? (
          <p className="empty">Zatím nemáte žádné třídy.</p>
        ) : (
          <div className="class-list">
            {classes.map(cls => (
              <div key={cls.id} className="class-card">
                <h3>{cls.name}</h3>
                <p><strong>Kód:</strong> {cls.join_code}</p>
                <p><strong>Studentů:</strong> {cls.students?.length || 0}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <h2>📝 Témata</h2>
        {topics.length === 0 ? (
          <p className="empty">Zatím nemáte žádná témata.</p>
        ) : (
          <div className="topic-list">
            {topics.map(topic => (
              <div key={topic.id} className="topic-card">
                <h3>{topic.title}</h3>
                <p>{topic.description}</p>
                <p><strong>Úroveň:</strong> {topic.level}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
