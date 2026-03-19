import { useState, useEffect } from 'react'

export default function TeacherDashboardSimple({ api, user, token, authHeaders, onOpenChat }) {
  const [topics, setTopics] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const headers = { 'Authorization': `Bearer ${token}` }
        const [topicsRes, classesRes] = await Promise.all([
          fetch(`${api}/api/topics`, { headers }),
          fetch(`${api}/api/classes`, { headers }),
        ])
        
        const classesData = await classesRes.json()
        setClasses(classesData)
        setTopics(await topicsRes.json())
      } catch (err) {
        console.error('Error fetching data:', err)
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
      <h1>Teacher Dashboard - Simple Version</h1>
      
      <section className="section">
        <h2>🏫 Třídy</h2>
        {classes.length === 0 ? (
          <p className="empty">Zatím nemáš žádné třídy.</p>
        ) : (
          <div className="class-list">
            {classes.map(cls => (
              <div key={cls.id} className="class-card">
                <h3>{cls.name}</h3>
                <p>Kód: {cls.join_code}</p>
                <p>Studentů: {cls.students?.length || 0}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <h2>📝 Témata</h2>
        {topics.length === 0 ? (
          <p className="empty">Zatím nemáš žádná témata.</p>
        ) : (
          <div className="topic-list">
            {topics.map(topic => (
              <div key={topic.id} className="topic-card">
                <h3>{topic.title}</h3>
                <p>{topic.description}</p>
                <p>Úroveň: {topic.level}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
