import { useEffect, useState } from 'react'

export default function Login({ api, onLogin }) {
  const [isRegister, setIsRegister] = useState(false)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [classCode, setClassCode] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [needsVerification, setNeedsVerification] = useState(false)
  const [verificationIdentifier, setVerificationIdentifier] = useState('')
  const [showReset, setShowReset] = useState(false)
  const [resetIdentifier, setResetIdentifier] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [resetPassword, setResetPassword] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('verify') || params.get('token')
    const reset = params.get('reset') || ''
    if (reset) {
      setResetToken(reset)
      setShowReset(true)
    }
    if (!token) return
    setLoading(true)
    setError('')
    setInfo('')
    fetch(`${api}/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.error || 'Ověření se nezdařilo')
        setInfo('Email ověřen. Teď se můžeš přihlásit.')
        setError('')
        setNeedsVerification(false)
        setVerificationIdentifier('')
        window.history.replaceState({}, '', window.location.pathname)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [api])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setNeedsVerification(false)
    setLoading(true)
    try {
      const url = isRegister ? `${api}/api/auth/register` : `${api}/api/auth/login`
      const body = isRegister
        ? { username, password, name, classCode: classCode.trim(), email: email.trim() || undefined }
        : { username, password }
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.needsVerification) {
          setNeedsVerification(true)
          setVerificationIdentifier(email.trim() || username.trim())
        }
        throw new Error(data.error || 'Chyba přihlášení')
      }
      if (data.needsVerification) {
        setNeedsVerification(true)
        setVerificationIdentifier(email.trim() || username.trim())
        setInfo('Zkontroluj email a potvrď ověření. Pak se přihlas.')
        return
      }
      onLogin(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleResendVerification = async () => {
    const identifier = (verificationIdentifier || email || username).trim()
    if (!identifier) {
      setError('Zadej email nebo uživatelské jméno')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${api}/api/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Nepodařilo se odeslat email')
      setInfo('Ověřovací email byl znovu odeslán.')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRequestReset = async () => {
    const identifier = (resetIdentifier || username || email).trim()
    if (!identifier) {
      setError('Zadej email nebo uživatelské jméno')
      return
    }
    setLoading(true)
    setError('')
    setInfo('')
    try {
      const res = await fetch(`${api}/api/auth/request-password-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Nepodařilo se odeslat email')
      setInfo('Pokud účet existuje, poslali jsme odkaz na email.')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!resetToken) {
      setError('Chybí token pro reset hesla')
      return
    }
    if (!resetPassword || resetPassword.length < 4) {
      setError('Heslo musí mít min. 4 znaky')
      return
    }
    setLoading(true)
    setError('')
    setInfo('')
    try {
      const res = await fetch(`${api}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, newPassword: resetPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Reset se nezdařil')
      setInfo('Heslo změněno. Teď se můžeš přihlásit.')
      setShowReset(false)
      setResetToken('')
      setResetPassword('')
      window.history.replaceState({}, '', window.location.pathname)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-background">
        <div className="floating-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
        </div>
      </div>
      
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="logo-container">
              <h1 className="logo">👋 Kámo</h1>
            </div>
            <p className="login-subtitle">Tvůj AI lektor českého jazyka</p>
            <p className="login-description">
              {isRegister 
                ? 'Přidej se ke své třídě a začněn se učit česky zábavnou formou'
                : 'Přihlas se a pokračuj ve své cestě k dokonalé češtině'
              }
            </p>
          </div>

          <div className="login-tabs">
            <button 
              className={`tab ${!isRegister ? 'active' : ''}`} 
              onClick={() => { setIsRegister(false); setError('') }}
            >
              <span className="tab-icon">🔑</span>
              Přihlášení
            </button>
            <button 
              className={`tab ${isRegister ? 'active' : ''}`} 
              onClick={() => { setIsRegister(true); setError('') }}
            >
              <span className="tab-icon">📝</span>
              Registrace
            </button>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {showReset && (
              <div className="reset-panel">
                <div className="form-group">
                  <label className="form-label">
                    <span className="label-icon">📧</span>
                    Email nebo uživatelské jméno
                  </label>
                  <input
                    type="text"
                    placeholder="Zadej email nebo uživatelské jméno"
                    value={resetIdentifier}
                    onChange={e => setResetIdentifier(e.target.value)}
                    className="form-input"
                  />
                </div>
                <button type="button" className="login-button secondary" onClick={handleRequestReset} disabled={loading}>
                  📩 Poslat odkaz pro reset
                </button>
              </div>
            )}

            {showReset && resetToken && (
              <div className="reset-panel">
                <div className="form-group">
                  <label className="form-label">
                    <span className="label-icon">🔑</span>
                    Nové heslo
                  </label>
                  <input
                    type="password"
                    placeholder="Zadej nové heslo"
                    value={resetPassword}
                    onChange={e => setResetPassword(e.target.value)}
                    className="form-input"
                  />
                </div>
                <button type="button" className="login-button secondary" onClick={handleResetPassword} disabled={loading}>
                  ✅ Nastavit nové heslo
                </button>
              </div>
            )}

            {isRegister && (
              <div className="form-group">
                <label className="form-label">
                  <span className="label-icon">👤</span>
                  Tvoje jméno
                </label>
                <input
                  type="text"
                  placeholder="Např. Jan Novák"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  className="form-input"
                />
              </div>
            )}

            {isRegister && (
              <div className="form-group">
                <label className="form-label">
                  <span className="label-icon">📧</span>
                  Email (volitelné)
                </label>
                <input
                  type="email"
                  placeholder="napr. ucitel@email.cz"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="form-input"
                />
              </div>
            )}

            {isRegister && (
              <div className="form-group">
                <label className="form-label">
                  <span className="label-icon">🏫</span>
                  Kód třídy
                </label>
                <input
                  type="text"
                  placeholder="Kód od učitele (např. ABC123)"
                  value={classCode}
                  onChange={e => setClassCode(e.target.value)}
                  className="form-input"
                />
                <div className="form-help">
                  Kód najdeš na pozvánce od učitele. Bez kódu se do třídy nepřipojíš.
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">
                <span className="label-icon">🆔</span>
                Uživatelské jméno nebo email
              </label>
              <input
                type="text"
                placeholder="Zadej uživatelské jméno nebo email"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <span className="label-icon">🔒</span>
                Heslo
              </label>
              <input
                type="password"
                placeholder="Zadej své heslo"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="form-input"
              />
            </div>

            {info && (
              <div className="info-message">
                <span className="info-icon">📨</span>
                {info}
              </div>
            )}

            {error && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                {error}
              </div>
            )}

            {needsVerification && (
              <div className="verify-actions">
                <button type="button" className="login-button secondary" onClick={handleResendVerification} disabled={loading}>
                  📧 Poslat ověření znovu
                </button>
              </div>
            )}

            {!showReset && (
              <div className="verify-actions">
                <button type="button" className="login-button secondary" onClick={() => { setShowReset(true); setError(''); setInfo('') }}>
                  🔁 Zapomenuté heslo?
                </button>
              </div>
            )}

            <button type="submit" disabled={loading} className="login-button">
              {loading ? (
                <>
                  <span className="loading-spinner"></span>
                  {isRegister ? 'Registruji...' : 'Přihlašuji...'}
                </>
              ) : (
                <>
                  <span className="button-icon">{isRegister ? '📝' : '🔑'}</span>
                  {isRegister ? 'Zaregistrovat se' : 'Přihlásit se'}
                </>
              )}
            </button>
          </form>

          <div className="login-footer">
            {!isRegister ? (
              <div className="demo-info">
                <div className="demo-badge">🎓 Demo přístup</div>
                <p>Učitel: <code>ucitel</code> / <code>ucitel123</code></p>
              </div>
            ) : (
              <div className="register-info">
                <div className="info-item">
                  <span className="info-icon">👨‍🎓</span>
                  <span>Noví uživatelé se registrují jako žáci</span>
                </div>
                <div className="info-item">
                  <span className="info-icon">📋</span>
                  <span>Potřebuješ kód třídy od svého učitele</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
