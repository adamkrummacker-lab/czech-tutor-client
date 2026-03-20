import { useEffect, useState } from 'react'
import FinalTest from './pages/FinalTest'
import Login from './pages/Login'
import TeacherDashboard from './pages/TeacherDashboard'
import StudentDashboard from './pages/StudentDashboard'
import Chat from './pages/Chat'
import Vocabulary from './pages/Vocabulary'
import Stats from './pages/Stats'
import Settings from './pages/Settings'
import Evaluations from './pages/Evaluations'
import './App.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export default function App() {
  const [user, setUserState] = useState(null)
  const [page, setPage] = useState('dashboard')
  const [activeTopic, setActiveTopic] = useState(null)
  const [viewingStudent, setViewingStudent] = useState(null)
  const [dailyTip, setDailyTip] = useState(null)

  const token = user?.token

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  })

  const setUser = (u) => {
    setUserState(u)
    if (u) {
      window.localStorage.setItem('kamoUser', JSON.stringify(u))
    } else {
      window.localStorage.removeItem('kamoUser')
    }
  }

  useEffect(() => {
    const saved = window.localStorage.getItem('kamoUser')
    if (saved) {
      let parsed = null
      try {
        parsed = JSON.parse(saved)
      } catch {
        window.localStorage.removeItem('kamoUser')
      }
      if (parsed) {
        setUserState(parsed)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const isTeacher = user?.role === 'teacher'
    const theme = isTeacher ? 'light' : (user?.preferences?.theme || 'dark')
    document.documentElement.setAttribute('data-theme', theme)
  }, [user?.role, user?.preferences?.theme])

  useEffect(() => {
    if (!user?.role) {
      document.documentElement.removeAttribute('data-role')
      return
    }
    document.documentElement.setAttribute('data-role', user.role)
  }, [user?.role])

  useEffect(() => {
    if (!token) return
    fetch(`${API}/api/daily-tip`, { headers: authHeaders() })
      .then(r => r.json())
      .then(data => setDailyTip(data.tip || null))
      .catch(() => {})
  }, [token])

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
    <div className={`app ${user.role === 'teacher' ? 'teacher-dashboard' : ''}`}>
      <nav className="navbar">
        <div className="nav-left">
          <span className="logo">👋 Kámo</span>
          {dailyTip && <span className="daily-tip">{dailyTip}</span>}
          {page !== 'dashboard' && <button className="btn-back" onClick={goBack}>← Zpět</button>}
        </div>
        <div className="nav-right">
          {user.role === 'student' && (
            <>
              <button className={`nav-tab ${page === 'dashboard' ? 'active' : ''}`} onClick={() => setPage('dashboard')}>🎮 Témata</button>
              <button className={`nav-tab ${page === 'vocabulary' ? 'active' : ''}`} onClick={() => setPage('vocabulary')}>📖 Slovníček</button>
              <button className={`nav-tab ${page === 'evaluations' ? 'active' : ''}`} onClick={() => setPage('evaluations')}>📌 Hodnocení</button>
            </>
          )}
          {user.role === 'teacher' && (
            <>
              <button className={`nav-tab ${page === 'dashboard' ? 'active' : ''}`} onClick={() => setPage('dashboard')}>📚 Témata</button>
              <button className={`nav-tab ${page === 'stats' ? 'active' : ''}`} onClick={() => setPage('stats')}>📊 Statistiky</button>
            </>
          )}
          <button className={`nav-tab ${page === 'settings' ? 'active' : ''}`} onClick={() => setPage('settings')}>⚙️ Nastavení</button>
          <span className="user-info">{user.preferences?.nickname || user.name}</span>
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
        {page === 'evaluations' && (
          <Evaluations api={API} authHeaders={authHeaders} />
        )}
        {page === 'settings' && (
          <Settings api={API} authHeaders={authHeaders} user={user} setUser={setUser} />
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
