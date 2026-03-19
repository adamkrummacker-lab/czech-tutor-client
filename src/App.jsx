import { useState } from 'react'
import FinalTest from './pages/FinalTest'
import Login from './pages/Login'
import TeacherDashboard from './pages/TeacherDashboard'
import StudentDashboard from './pages/StudentDashboard'
import Chat from './pages/Chat'
import Vocabulary from './pages/Vocabulary'
import Stats from './pages/Stats'
import './App.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export default function App() {
  const [user, setUser] = useState(null)
  const [page, setPage] = useState('dashboard')
  const [activeTopic, setActiveTopic] = useState(null)
  const [viewingStudent, setViewingStudent] = useState(null)

  const token = user?.token

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  })

  if (!user) {
    return <Login api={API} onLogin={setUser} />
  }

  const openChat = (topic, student = null) => {
    setActiveTopic(topic)
    setViewingStudent(student)
    setPage('chat')
  }

  const goBack = () => {
    setPage('dashboard')
    setActiveTopic(null)
    setViewingStudent(null)
  }

  const logout = () => {
    setUser(null)
    setPage('dashboard')
  }

  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-left">
          <span className="logo">🇨🇿 Czech Tutor</span>
          {page !== 'dashboard' && <button className="btn-back" onClick={goBack}>← Zpět</button>}
        </div>
        <div className="nav-right">
          {user.role === 'student' && (
            <>
              <button className={`nav-tab ${page === 'dashboard' ? 'active' : ''}`} onClick={() => setPage('dashboard')}>🎮 Témata</button>
              <button className={`nav-tab ${page === 'vocabulary' ? 'active' : ''}`} onClick={() => setPage('vocabulary')}>📖 Slovníček</button>
            </>
          )}
          {user.role === 'teacher' && (
            <>
              <button className={`nav-tab ${page === 'dashboard' ? 'active' : ''}`} onClick={() => setPage('dashboard')}>📚 Témata</button>
              <button className={`nav-tab ${page === 'stats' ? 'active' : ''}`} onClick={() => setPage('stats')}>📊 Statistiky</button>
            </>
          )}
          <span className="user-info">{user.name}</span>
          <button className="btn-logout" onClick={logout}>Odhlásit</button>
        </div>
      </nav>

      <main className="main">
        {page === 'dashboard' && user.role === 'teacher' && (
          <TeacherDashboard api={API} user={user} token={token} authHeaders={authHeaders} onOpenChat={openChat} />
        )}
        {page === 'dashboard' && user.role === 'student' && (
          <StudentDashboard api={API} user={user} token={token} authHeaders={authHeaders} onOpenChat={openChat} />
        )}
        {page === 'chat' && (
          <Chat api={API} user={user} token={token} authHeaders={authHeaders} topic={activeTopic} viewingStudent={viewingStudent} onGoToFinalTest={() => setPage('finaltest')} />
        )}
        {page === 'vocabulary' && (
          <Vocabulary api={API} user={user} token={token} authHeaders={authHeaders} />
        )}
        {page === 'stats' && (
          <Stats api={API} user={user} token={token} authHeaders={authHeaders} />
        )}
        {page === 'finaltest' && (
          <FinalTest />
        )}
      </main>
    </div>
  )
}
