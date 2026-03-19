import { useEffect, useState } from 'react'

export default function Settings({ api, authHeaders, user, setUser }) {
  const [prefs, setPrefs] = useState({ nickname: '', avatar: '😎', theme: 'light' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [classCode, setClassCode] = useState('')
  const [classMessage, setClassMessage] = useState(null)
  const [joiningClass, setJoiningClass] = useState(false)

  useEffect(() => {
    if (!user) return
    fetch(`${api}/api/me/preferences`, { headers: authHeaders() })
      .then(r => r.json())
      .then(data => {
        setPrefs(prev => ({ ...prev, ...data }))
      })
  }, [user])

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`${api}/api/me/preferences`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(prefs),
      })
      const data = await res.json()
      setUser(prev => ({ ...prev, preferences: data }))
      setMessage('✅ Nastavení uloženo!')
    } catch (err) {
      setMessage('⚠️ Chyba při ukládání.')
    } finally {
      setSaving(false)
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const joinClass = async (e) => {
    e.preventDefault()
    if (!classCode.trim()) return
    setJoiningClass(true)
    try {
      const res = await fetch(`${api}/api/classes/join`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ code: classCode.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Chyba při přihlášení do třídy')
      setClassMessage('✅ Přihlášeno do třídy! Stránka se obnoví...')
      setTimeout(() => window.location.reload(), 1200)
    } catch (err) {
      setClassMessage(err.message)
    } finally {
      setJoiningClass(false)
    }
  }

  return (
    <div className="settings-page">
      <h2>⚙️ Nastavení</h2>
      <form onSubmit={save} className="settings-form">
        <label>
          Přezdívka
          <input
            value={prefs.nickname || ''}
            onChange={e => setPrefs({ ...prefs, nickname: e.target.value })}
            placeholder="Jak tě má Kámo oslovovat?"
          />
        </label>
        <label>
          Avatar (emoji)
          <input
            value={prefs.avatar || ''}
            onChange={e => setPrefs({ ...prefs, avatar: e.target.value })}
            placeholder="😎"
          />
        </label>
        <label>
          Téma
          <select value={prefs.theme || 'light'} onChange={e => setPrefs({ ...prefs, theme: e.target.value })}>
            <option value="light">Světlé</option>
            <option value="dark">Tmavé</option>
          </select>
        </label>
        <button type="submit" disabled={saving}>{saving ? 'Ukládám…' : 'Uložit nastavení'}</button>
        {message && <div className="settings-message">{message}</div>}
      </form>

      {user.role === 'student' && (
        <section className="settings-section">
          <h3>🏫 Přihlásit se do třídy</h3>
          <form className="settings-form" onSubmit={joinClass}>
            <input
              value={classCode}
              onChange={e => setClassCode(e.target.value)}
              placeholder="Kód třídy"
            />
            <button type="submit" disabled={joiningClass}>{joiningClass ? '...' : 'Přihlásit'}</button>
          </form>
          {classMessage && <div className="settings-message">{classMessage}</div>}
        </section>
      )}
    </div>
  )
}
