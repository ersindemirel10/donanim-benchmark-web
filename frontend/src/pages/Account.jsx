import { useState } from 'react'
import { api } from '../api.js'
import { useAuth } from '../auth/AuthContext.jsx'

// Hesabım: bilgileri güncelle, şifre değiştir, hesabı sil.
// Sayfa ProtectedRoute içinde olduğu için user her zaman dolu.
export default function Account() {
  const { user, updateUser, logout } = useAuth()

  // --- Bilgilerim ---
  const [username, setUsername] = useState(user.username)
  const [email, setEmail] = useState(user.email)
  const [infoError, setInfoError] = useState('')
  const [infoSuccess, setInfoSuccess] = useState('')
  const [infoSaving, setInfoSaving] = useState(false)

  // --- Şifre ---
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState('')
  const [pwSaving, setPwSaving] = useState(false)

  // --- Hesap silme ---
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)

  async function handleInfoSubmit(e) {
    e.preventDefault()
    setInfoError('')
    setInfoSuccess('')
    setInfoSaving(true)
    try {
      const me = await api.put('/auth/me/', { username, email })
      updateUser(me) // navbar'daki kullanıcı adı da güncellenir
      setInfoSuccess('Bilgilerin güncellendi.')
    } catch (err) {
      setInfoError(err.message) // 409: kullanıcı adı/e-posta başkasında, 400: geçersiz değer
    } finally {
      setInfoSaving(false)
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault()
    setPwError('')
    setPwSuccess('')
    setPwSaving(true)
    try {
      await api.post('/auth/change-password/', {
        old_password: oldPassword,
        new_password: newPassword,
      })
      setOldPassword('')
      setNewPassword('')
      setPwSuccess('Şifren değiştirildi.')
    } catch (err) {
      setPwError(err.message)
    } finally {
      setPwSaving(false)
    }
  }

  async function handleDelete(e) {
    e.preventDefault()
    setDeleteError('')
    if (!window.confirm('Hesabın ve sistemlerin kalıcı olarak silinecek. Emin misin?')) return
    setDeleting(true)
    try {
      await api.delete('/auth/me/', { password: deletePassword })
      // Token'ları temizler; ProtectedRoute mesajla birlikte /login'e yönlendirir
      logout('Hesabın silindi.')
    } catch (err) {
      setDeleteError(err.message)
      setDeleting(false)
    }
  }

  return (
    <div className="narrow-stack">
      <h2>Hesabım</h2>

      <div className="card narrow">
        <h3>Bilgilerim</h3>
        {infoSuccess && <p className="success">{infoSuccess}</p>}
        {infoError && <p className="error">{infoError}</p>}
        <form onSubmit={handleInfoSubmit}>
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
          <button type="submit" disabled={infoSaving}>
            {infoSaving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </form>
      </div>

      <div className="card narrow">
        <h3>Şifre değiştir</h3>
        {pwSuccess && <p className="success">{pwSuccess}</p>}
        {pwError && <p className="error">{pwError}</p>}
        <form onSubmit={handlePasswordSubmit}>
          <label>
            Eski şifre
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
            />
          </label>
          <label>
            Yeni şifre
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </label>
          <button type="submit" disabled={pwSaving}>
            {pwSaving ? 'Değiştiriliyor...' : 'Şifreyi değiştir'}
          </button>
        </form>
      </div>

      <div className="card narrow danger-zone">
        <h3>Hesabı sil</h3>
        <p className="hint">
          Hesabını silersen sistemlerin, profillerin ve testlerin de silinir. Eklediğin parçalar
          ve yazılımlar katalogda kalır. Bu işlem geri alınamaz.
        </p>
        {deleteError && <p className="error">{deleteError}</p>}
        <form onSubmit={handleDelete}>
          <label>
            Şifren
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              required
            />
          </label>
          <button type="submit" className="danger" disabled={deleting}>
            {deleting ? 'Siliniyor...' : 'Hesabımı sil'}
          </button>
        </form>
      </div>
    </div>
  )
}
