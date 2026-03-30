import { useEffect, useState } from 'react'

export default function Settings({ api, authHeaders, user, setUser }) {
  const [prefs, setPrefs] = useState({
    nickname: '',
    avatar: '😎',
    theme: 'light',
    ttsEnabled: true,
    micEnabled: true,
    ttsVoice: '',
    uiLanguage: 'cs',
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [messageType, setMessageType] = useState('success')
  const [allBadges, setAllBadges] = useState([])
  const [badgeMessage, setBadgeMessage] = useState(null)
  const [voices, setVoices] = useState([])

  const [classInfo, setClassInfo] = useState(null)
  const [classLoading, setClassLoading] = useState(false)
  const [classMessage, setClassMessage] = useState(null)
  const [classMessageType, setClassMessageType] = useState('success')
  const [classCode, setClassCode] = useState('')
  const [joiningClass, setJoiningClass] = useState(false)
  const [leavingClass, setLeavingClass] = useState(false)

  useEffect(() => {
    if (!user) return

    fetch(`${api}/api/me/preferences`, { headers: authHeaders() })
      .then(r => r.json())
      .then(data => setPrefs(prev => ({ ...prev, ...data })))

    if (user.role === 'student') {
      setClassLoading(true)
      fetch(`${api}/api/classes/me`, { headers: authHeaders() })
        .then(r => r.json())
        .then(data => setClassInfo(data))
        .catch(() => setClassInfo(null))
        .finally(() => setClassLoading(false))

      fetch(`${api}/api/gamification`, { headers: authHeaders() })
        .then(r => r.json())
        .then(data => setAllBadges(Array.isArray(data.allBadges) ? data.allBadges : []))
        .catch(() => setAllBadges([]))
    }
  }, [user])

  useEffect(() => {
    if (!('speechSynthesis' in window)) return
    const loadVoices = () => {
      const list = window.speechSynthesis.getVoices() || []
      setVoices(list)
    }
    loadVoices()
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices)
  }, [])

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch(`${api}/api/me/preferences`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(prefs),
      })
      const data = await res.json()
      setUser(prev => ({ ...prev, preferences: data }))
      setMessageType('success')
      setMessage('✅ Nastavení uloženo!')
    } catch (err) {
      setMessageType('error')
      setMessage('⚠️ Chyba při ukládání.')
    } finally {
      setSaving(false)
      setTimeout(() => setMessage(null), 3200)
    }
  }

  const joinClass = async (e) => {
    e.preventDefault()
    if (!classCode.trim()) return
    setJoiningClass(true)
    setClassMessage(null)

    try {
      const code = classCode.trim().toUpperCase()
      const res = await fetch(`${api}/api/classes/join`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ code }),
      })

      let data
      try {
        data = await res.json()
      } catch {
        data = null
      }

      if (!res.ok) {
        const errMsg = data?.error || `${res.status} ${res.statusText}`
        throw new Error(errMsg)
      }

      setClassMessageType('success')
      setClassMessage('✅ Přihlášeno do třídy! Stránka se obnoví...')
      setTimeout(() => window.location.reload(), 1200)
    } catch (err) {
      console.error('Join class error:', err)
      setClassMessageType('error')
      setClassMessage(err.message)
    } finally {
      setJoiningClass(false)
    }
  }

  const leaveClass = async () => {
    if (!classInfo?.class) return
    if (!window.confirm('Opravdu chceš opustit tuto třídu?')) return

    setLeavingClass(true)
    setClassMessage(null)

    try {
      const res = await fetch(`${api}/api/classes/leave`, {
        method: 'POST',
        headers: authHeaders(),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Nepodařilo se opustit třídu')
      setClassMessageType('success')
      setClassMessage('✅ Opustil/a jsi třídu. Můžeš se přihlásit do jiné.')
      setClassInfo({ role: 'student' })
    } catch (err) {
      setClassMessageType('error')
      setClassMessage(err.message)
    } finally {
      setLeavingClass(false)
    }
  }

  const toggleBadge = (key, earned) => {
    if (!earned) return
    const selected = Array.isArray(prefs.profileBadges) ? prefs.profileBadges : []
    if (selected.includes(key)) {
      setPrefs({ ...prefs, profileBadges: selected.filter(k => k !== key) })
      setBadgeMessage(null)
      return
    }
    if (selected.length >= 3) {
      setBadgeMessage('Můžeš vybrat maximálně 3 odznaky.')
      return
    }
    setPrefs({ ...prefs, profileBadges: [...selected, key] })
    setBadgeMessage(null)
  }

  return (
    <div className="settings-page">
      <h2>⚙️ Nastavení</h2>

      <div className="settings-grid">
        <div className="settings-card">
          <h3>🧑‍💻 Osobní nastavení</h3>
          <form onSubmit={save} className="settings-form">
            {user.role === 'student' && (
              <>
                <label className="field-row">
                  <span>Přezdívka</span>
                  <input
                    value={prefs.nickname || ''}
                    onChange={e => setPrefs({ ...prefs, nickname: e.target.value })}
                    placeholder="Jak tě má Kámo oslovovat?"
                  />
                </label>
                <label className="field-row">
                  <span>Avatar (emoji)</span>
                  <input
                    value={prefs.avatar || ''}
                    onChange={e => setPrefs({ ...prefs, avatar: e.target.value })}
                    placeholder="😎"
                  />
                </label>
              </>
            )}
            <label className="field-row">
              <span>Téma</span>
              <select value={prefs.theme || 'light'} onChange={e => setPrefs({ ...prefs, theme: e.target.value })}>
                <option value="light">Světlé</option>
                <option value="dark">Tmavé</option>
              </select>
            </label>
            <label className="field-row">
              <span>Jazyk UI</span>
              <select value={prefs.uiLanguage || 'cs'} onChange={e => setPrefs({ ...prefs, uiLanguage: e.target.value })}>
                <option value="cs">Čeština</option>
                <option value="de">Deutsch</option>
                <option value="en">English</option>
              </select>
            </label>
            <label className="field-row">
              <span>Audio – automatické čtení odpovědí</span>
              <input
                type="checkbox"
                checked={prefs.ttsEnabled !== false}
                onChange={e => setPrefs({ ...prefs, ttsEnabled: e.target.checked })}
              />
            </label>
            <label className="field-row">
              <span>Hlas pro čtení</span>
              <select value={prefs.ttsVoice || ''} onChange={e => setPrefs({ ...prefs, ttsVoice: e.target.value })}>
                <option value="">Výchozí</option>
                {voices.map(v => (
                  <option key={`${v.name}-${v.lang}`} value={v.name}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </label>
            <label className="field-row">
              <span>Mikrofon – hlasové zadávání</span>
              <input
                type="checkbox"
                checked={prefs.micEnabled !== false}
                onChange={e => setPrefs({ ...prefs, micEnabled: e.target.checked })}
              />
            </label>
            <div className="form-actions">
              <button type="submit" disabled={saving}>{saving ? 'Ukládám…' : 'Uložit nastavení'}</button>
            </div>
            {message && <div className={`alert ${messageType === 'error' ? 'alert-error' : 'alert-success'}`}>{message}</div>}
          </form>
        </div>

        {user.role === 'student' && (
          <div className="settings-card">
            <h3>🏫 Třída</h3>

            {classLoading ? (
              <div className="small-note">Načítám informace o třídě…</div>
            ) : classInfo?.class ? (
              <div className="class-info">
                <p>✅ Patříš do třídy <strong>{classInfo.class.name}</strong> (učitel: {classInfo.class.teacher_name}).</p>
                <button className="btn-secondary" onClick={leaveClass} disabled={leavingClass}>
                  {leavingClass ? 'Odcházím…' : 'Opustit třídu'}
                </button>
              </div>
            ) : (
              <>
                <p className="small-note">Zadej kód, který ti poslal učitel. Najdeš ho v jeho přehledu tříd.</p>
                <form className="settings-form" onSubmit={joinClass}>
                  <input
                    value={classCode}
                    onChange={e => setClassCode(e.target.value.toUpperCase())}
                    placeholder="Kód třídy"
                  />
                  <button type="submit" disabled={joiningClass}>{joiningClass ? '...' : 'Přihlásit'}</button>
                </form>
              </>
            )}

            {classMessage && <div className={`alert ${classMessageType === 'error' ? 'alert-error' : 'alert-success'}`}>{classMessage}</div>}
          </div>
        )}

        <div className="settings-card">
          <h3>🚪 Účet</h3>
          <button className="btn-secondary" onClick={() => setUser(null)}>
            Odhlásit se
          </button>
        </div>

        {user.role === 'student' && (
          <div className="settings-card">
            <h3>🏅 Achievements v žebříčku</h3>
            <p className="small-note">Vyber až 3 odznaky, které se zobrazí u tebe v žebříčku třídy.</p>
            {badgeMessage && <div className="alert alert-error">{badgeMessage}</div>}
            <div className="badge-picker">
              {allBadges.map(b => {
                const selected = Array.isArray(prefs.profileBadges) && prefs.profileBadges.includes(b.key)
                return (
                  <button
                    key={b.key}
                    type="button"
                    className={`badge-pick ${b.earned ? 'earned' : 'locked'} ${selected ? 'selected' : ''}`}
                    onClick={() => toggleBadge(b.key, b.earned)}
                    title={b.desc}
                  >
                    <span className="badge-emoji">{b.earned ? b.emoji : '🔒'}</span>
                    <span className="badge-name">{b.name}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
