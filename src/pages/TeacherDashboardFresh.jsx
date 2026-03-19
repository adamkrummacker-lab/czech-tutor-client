import { useState, useEffect } from 'react'

export default function TeacherDashboardFresh({ api, user, token, authHeaders, onOpenChat }) {
  const [loading, setLoading] = useState(true)
  const [classes, setClasses] = useState([])
  const [topics, setTopics] = useState([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = { 'Authorization': `Bearer ${token}` }
        const [classesRes, topicsRes] = await Promise.all([
          fetch(`${api}/api/classes`, { headers }),
          fetch(`${api}/api/topics`, { headers }),
        ])
        
        setClasses(await classesRes.json())
        setTopics(await topicsRes.json())
      } catch (err) {
        console.error('Error:', err)
      }
      setLoading(false)
    }

    fetchData()
  }, [api, token])

  if (loading) {
    return <div className="loading">Načítám...</div>
  }

  return (
    <div className="dashboard">
      <h1>🎓 Teacher Dashboard - Fresh Version</h1>
      
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
