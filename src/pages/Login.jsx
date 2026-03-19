import { useState } from 'react'

export default function Login({ api, onLogin }) {
  const [isRegister, setIsRegister] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [classCode, setClassCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const url = isRegister ? `${api}/api/auth/register` : `${api}/api/auth/login`
      const body = isRegister
        ? { username, password, name, classCode: classCode.trim() }
        : { username, password }
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onLogin(data)
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
              </div>
            )}

            <div className="form-group">
              <label className="form-label">
                <span className="label-icon">🆔</span>
                Uživatelské jméno
              </label>
              <input
                type="text"
                placeholder="Zadej své uživatelské jméno"
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

            {error && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                {error}
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
