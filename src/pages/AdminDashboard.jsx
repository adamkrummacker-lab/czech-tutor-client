import { useEffect, useState } from 'react'

export default function AdminDashboard({ api, token, t, onLogout }) {
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({ username: '', name: '', email: '', password: '' })

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  })

  const loadTeachers = () => {
    setLoading(true)
    setError('')
    fetch(`${api}/api/admin/teachers`, { headers: authHeaders() })
      .then(r => r.json())
      .then(data => {
        setTeachers(data.teachers || [])
      })
      .catch(() => setError(t('admin_load_error')))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadTeachers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onCreate = async (e) => {
    e.preventDefault()
    setMessage('')
    setError('')
    if (!form.username.trim() || !form.name.trim()) {
      setError(t('admin_required'))
      return
    }
    const res = await fetch(`${api}/api/admin/teachers`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        username: form.username.trim(),
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        password: form.password.trim() || undefined,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data?.error || t('admin_create_error'))
      return
    }
    const passNote = data.password ? ` ${t('admin_created_password')} ${data.password}` : ''
    setMessage(`${t('admin_created_ok')}${passNote}`)
    setForm({ username: '', name: '', email: '', password: '' })
    loadTeachers()
  }

  const onDelete = async (teacher) => {
    const ok = window.confirm(t('admin_delete_confirm', { name: teacher.name }))
    if (!ok) return
    setError('')
    setMessage('')
    const res = await fetch(`${api}/api/admin/teachers/${teacher.id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data?.error || t('admin_delete_error'))
      return
    }
    setMessage(t('admin_delete_ok'))
    loadTeachers()
  }

  return (
    <div className="admin-dashboard">
      <div className="section-header">
        <h2>{t('admin_title')}</h2>
        <button className="btn-logout" onClick={onLogout}>{t('nav_logout')}</button>
      </div>

      <div className="section">
        <h3>{t('admin_create_title')}</h3>
        <form className="admin-form" onSubmit={onCreate}>
          <input
            type="text"
            placeholder={t('admin_username')}
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />
          <input
            type="text"
            placeholder={t('admin_name')}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            type="email"
            placeholder={t('admin_email_optional')}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            type="text"
            placeholder={t('admin_password_optional')}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <button className="btn-primary" type="submit">{t('admin_create_btn')}</button>
        </form>
        {message && <div className="admin-message ok">{message}</div>}
        {error && <div className="admin-message error">{error}</div>}
      </div>

      <div className="section">
        <h3>{t('admin_list_title')}</h3>
        {loading && <div>{t('admin_loading')}</div>}
        {!loading && teachers.length === 0 && <div>{t('admin_empty')}</div>}
        {!loading && teachers.length > 0 && (
          <div className="admin-teachers">
            {teachers.map(tch => (
              <div key={tch.id} className="admin-teacher-card">
                <div>
                  <strong>{tch.name}</strong> ({tch.username})
                </div>
                <div className="admin-teacher-meta">
                  {t('admin_classes')}: {tch.class_count} · {t('admin_students')}: {tch.student_count}
                  {tch.email ? ` · ${tch.email}` : ''}
                </div>
                <button className="btn-delete" onClick={() => onDelete(tch)}>
                  {t('admin_delete_btn')}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
