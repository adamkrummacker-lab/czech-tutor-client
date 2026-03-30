import { useEffect, useState } from 'react'

export default function Settings({ api, authHeaders, user, setUser, t }) {
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

  const tr = t || ((key, vars) => key)

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
      setMessage(tr('settings_save_success'))
    } catch (err) {
      setMessageType('error')
      setMessage(tr('settings_save_error'))
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
      setClassMessage(tr('settings_join_success'))
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
    if (!window.confirm(tr('settings_leave_confirm'))) return

    setLeavingClass(true)
    setClassMessage(null)

    try {
      const res = await fetch(`${api}/api/classes/leave`, {
        method: 'POST',
        headers: authHeaders(),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || tr('settings_leave_error'))
      setClassMessageType('success')
      setClassMessage(tr('settings_leave_success'))
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
      setBadgeMessage(tr('settings_badges_limit'))
      return
    }
    setPrefs({ ...prefs, profileBadges: [...selected, key] })
    setBadgeMessage(null)
  }

  return (
    <div className="settings-page">
      <h2>{tr('settings_title')}</h2>

      <div className="settings-grid">
        <div className="settings-card">
          <h3>{tr('settings_personal')}</h3>
          <form onSubmit={save} className="settings-form">
            {user.role === 'student' && (
              <>
                <label className="field-row">
                  <span>{tr('settings_nickname')}</span>
                  <input
                    value={prefs.nickname || ''}
                    onChange={e => setPrefs({ ...prefs, nickname: e.target.value })}
                    placeholder={tr('settings_nickname')}
                  />
                </label>
                <label className="field-row">
                  <span>{tr('settings_avatar')}</span>
                  <input
                    value={prefs.avatar || ''}
                    onChange={e => setPrefs({ ...prefs, avatar: e.target.value })}
                    placeholder="😎"
                  />
                </label>
              </>
            )}
            <label className="field-row">
              <span>{tr('settings_theme')}</span>
              <select value={prefs.theme || 'light'} onChange={e => setPrefs({ ...prefs, theme: e.target.value })}>
                <option value="light">{tr('settings_theme_light')}</option>
                <option value="dark">{tr('settings_theme_dark')}</option>
              </select>
            </label>
            <label className="field-row">
              <span>{tr('settings_lang')}</span>
              <select value={prefs.uiLanguage || 'cs'} onChange={e => setPrefs({ ...prefs, uiLanguage: e.target.value })}>
                <option value="cs">Čeština</option>
                <option value="de">Deutsch</option>
                <option value="en">English</option>
              </select>
            </label>
            <label className="field-row">
              <span>{tr('settings_audio')}</span>
              <input
                type="checkbox"
                checked={prefs.ttsEnabled !== false}
                onChange={e => setPrefs({ ...prefs, ttsEnabled: e.target.checked })}
              />
            </label>
            <label className="field-row">
              <span>{tr('settings_voice')}</span>
              <select value={prefs.ttsVoice || ''} onChange={e => setPrefs({ ...prefs, ttsVoice: e.target.value })}>
                <option value="">{tr('settings_voice_default')}</option>
                {voices.map(v => (
                  <option key={`${v.name}-${v.lang}`} value={v.name}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </label>
            <label className="field-row">
              <span>{tr('settings_mic')}</span>
              <input
                type="checkbox"
                checked={prefs.micEnabled !== false}
                onChange={e => setPrefs({ ...prefs, micEnabled: e.target.checked })}
              />
            </label>
            <div className="form-actions">
              <button type="submit" disabled={saving}>{saving ? tr('settings_saving') : tr('settings_save')}</button>
            </div>
            {message && <div className={`alert ${messageType === 'error' ? 'alert-error' : 'alert-success'}`}>{message}</div>}
          </form>
        </div>

        {user.role === 'student' && (
          <div className="settings-card">
            <h3>{tr('settings_class')}</h3>

            {classLoading ? (
              <div className="small-note">{tr('settings_class_loading')}</div>
            ) : classInfo?.class ? (
              <div className="class-info">
                <p>{tr('settings_class_in', { className: classInfo.class.name, teacherName: classInfo.class.teacher_name })}</p>
                <button className="btn-secondary" onClick={leaveClass} disabled={leavingClass}>
                  {leavingClass ? tr('settings_leave_busy') : tr('settings_leave')}
                </button>
              </div>
            ) : (
              <>
                <p className="small-note">{tr('settings_class_note')}</p>
                <form className="settings-form" onSubmit={joinClass}>
                  <input
                    value={classCode}
                    onChange={e => setClassCode(e.target.value.toUpperCase())}
                    placeholder={tr('settings_class_code')}
                  />
                  <button type="submit" disabled={joiningClass}>{joiningClass ? tr('settings_joining') : tr('settings_join')}</button>
                </form>
              </>
            )}

            {classMessage && <div className={`alert ${classMessageType === 'error' ? 'alert-error' : 'alert-success'}`}>{classMessage}</div>}
          </div>
        )}

        <div className="settings-card">
          <h3>{tr('settings_account')}</h3>
          <button className="btn-secondary" onClick={() => setUser(null)}>
            {tr('settings_logout')}
          </button>
        </div>

        {user.role === 'student' && (
          <div className="settings-card">
            <h3>{tr('settings_badges')}</h3>
            <p className="small-note">{tr('settings_badges_help')}</p>
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
