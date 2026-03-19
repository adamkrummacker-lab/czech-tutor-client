import { useState, useEffect } from 'react'

export default function TeacherDashboardFresh({ api, token }) {
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
  const [showAssignments, setShowAssignments] = useState(false)
  const [assignments, setAssignments] = useState([])
  const [assignmentForm, setAssignmentForm] = useState({
    lectureId: null,
    studentIds: []
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = { 'Authorization': `Bearer ${token}` }
        const [classesRes, topicsRes, lecturesRes, assignmentsRes] = await Promise.all([
          fetch(`${api}/api/classes`, { headers }),
          fetch(`${api}/api/topics`, { headers }),
          fetch(`${api}/api/lectures`, { headers }),
          fetch(`${api}/api/lecture-assignments`, { headers }),
        ])
        
        setClasses(await classesRes.json())
        setTopics(await topicsRes.json())
        setLectures(await lecturesRes.json())
        setAssignments(await assignmentsRes.json())
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
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
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
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      })

      if (!res.ok) throw new Error('Failed to delete lecture')

      setLectures(prev => prev.filter(l => l.id !== id))
    } catch (err) {
      console.error('Error deleting lecture:', err)
    }
  }

  const createAssignment = async (e) => {
    e.preventDefault()
    if (!assignmentForm.lectureId || assignmentForm.studentIds.length === 0) return

    try {
      const res = await fetch(`${api}/api/lecture-assignments`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(assignmentForm)
      })

      if (!res.ok) throw new Error('Failed to create assignment')

      const data = await res.json()
      setAssignments(prev => [data, ...prev])
      setAssignmentForm({ lectureId: null, studentIds: [] })
    } catch (err) {
      console.error('Error creating assignment:', err)
    }
  }

  const deleteAssignment = async (id) => {
    if (!confirm('Opravdu chcete smazat toto přiřazení?')) return

    try {
      const res = await fetch(`${api}/api/lecture-assignments/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      })

      if (!res.ok) throw new Error('Failed to delete assignment')

      setAssignments(prev => prev.filter(a => a.id !== id))
    } catch (err) {
      console.error('Error deleting assignment:', err)
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
        <div className="section-header">
          <h2>👥 Přiřazení studentů</h2>
          <button 
            className="btn-toggle" 
            onClick={() => setShowAssignments(!showAssignments)}
          >
            {showAssignments ? '✕ Skrýt' : '👥 Spravovat přiřazení'}
          </button>
        </div>

        {showAssignments && (
          <div className="assignment-form">
            <h3>👥 Přiřadit přednášku studentům</h3>
            <form onSubmit={createAssignment}>
              <div className="form-group">
                <label>Přednáška</label>
                <select
                  value={assignmentForm.lectureId}
                  onChange={e => setAssignmentForm(prev => ({ ...prev, lectureId: e.target.value }))}
                  required
                >
                  <option value="">-- Vyberte přednášku --</option>
                  {lectures.map(lecture => (
                    <option key={lecture.id} value={lecture.id}>
                      {lecture.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Studenti</label>
                <div className="student-selector">
                  {classes.map(cls => (
                    cls.students?.map(student => (
                      <div key={student.id} className="student-option">
                        <input
                          type="checkbox"
                          value={student.id}
                          checked={assignmentForm.studentIds.includes(student.id)}
                          onChange={e => {
                            const studentIds = e.target.checked
                              ? [...assignmentForm.studentIds, student.id]
                              : assignmentForm.studentIds.filter(id => id !== student.id);
                            setAssignmentForm(prev => ({ ...prev, studentIds }));
                          }}
                        />
                        <label>{student.name} ({student.username})</label>
                      </div>
                    ))
                  ))}
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  👥 Přiřadit studentům
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="assignments-list">
          <h3>📋 Moje přiřazení</h3>
          {assignments.length === 0 ? (
            <p className="empty">Zatím nemáte žádná přiřazení.</p>
          ) : (
            assignments.map(assignment => (
              <div key={assignment.id} className="assignment-card">
                <div className="assignment-header">
                  <h4>{assignment.lecture_title}</h4>
                  <div className="assignment-students">
                    {assignment.students?.map(student => (
                      <span key={student.id} className="assigned-student">
                        {student.name}
                      </span>
                    ))}
                  </div>
                  <button 
                    className="btn-delete"
                    onClick={() => deleteAssignment(assignment.id)}
                  >
                    🗑️ Smazat přiřazení
                  </button>
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
