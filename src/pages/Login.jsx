import { useState } from 'react'

export default function Login({ api, onLogin }) {
  const [isRegister, setIsRegister] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const url = isRegister ? `${api}/api/auth/register` : `${api}/api/auth/login`
      const body = isRegister
        ? { username, password, name }
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
      <div className="login-card">
        <h1>🇨🇿 Czech Tutor</h1>
        <p className="login-subtitle">AI lektor českého jazyka</p>

        <div className="login-tabs">
          <button className={`tab ${!isRegister ? 'active' : ''}`} onClick={() => { setIsRegister(false); setError('') }}>Přihlášení</button>
          <button className={`tab ${isRegister ? 'active' : ''}`} onClick={() => { setIsRegister(true); setError('') }}>Registrace</button>
        </div>

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <input
              type="text"
              placeholder="Tvoje jméno (např. Jan Novák)"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          )}
          <input
            type="text"
            placeholder="Uživatelské jméno"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Heslo"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? '...' : isRegister ? '📝 Zaregistrovat se' : '🔑 Přihlásit se'}
          </button>
        </form>

        {!isRegister && (
          <div className="login-hint">
            <p>Učitel: <code>ucitel</code> / <code>ucitel123</code></p>
            <p>Žák: <code>zak</code> / <code>zak123</code></p>
          </div>
        )}
        {isRegister && (
          <div className="login-hint">
            <p>Noví uživatelé se registrují jako žáci.</p>
          </div>
        )}
      </div>
    </div>
  )
}
