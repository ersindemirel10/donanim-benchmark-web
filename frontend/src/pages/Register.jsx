import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'

export default function Register() {
  const { user, register } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (user) return <Navigate to="/" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await register({ username, email, password })
      navigate('/login', { state: { message: 'Kayıt başarılı, şimdi giriş yapabilirsiniz.' } })
    } catch (err) {
      // 409: kullanıcı adı/e-posta kayıtlı, 400: şifre kuralları ya da eksik alan
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="card narrow">
      <h2>Kayıt Ol</h2>
      {error && <p className="error">{error}</p>}

      <form onSubmit={handleSubmit}>
        <label>
          Kullanıcı adı
          <input value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>
        <label>
          E-posta
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Şifre
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <button type="submit" disabled={submitting}>
          {submitting ? 'Kaydediliyor...' : 'Kayıt Ol'}
        </button>
      </form>

      <p>
        Zaten hesabın var mı? <Link to="/login">Giriş yap</Link>
      </p>
    </div>
  )
}
