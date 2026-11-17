import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { api } from '../api.js'
import BuildForm from './BuildForm.jsx'

export default function Builds() {
  const [builds, setBuilds] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const location = useLocation()
  // Detay sayfasından silince buraya mesaj taşınır
  const [success, setSuccess] = useState(location.state?.message ?? '')
  const [formOpen, setFormOpen] = useState(false)

  // Listeyi yeniden çekmek için bu sayacı artırırız (kayıt/silme sonrası)
  const [reloadKey, setReloadKey] = useState(0)
  const reload = () => setReloadKey((k) => k + 1)

  // Sayfa yenilenince mesaj tekrar görünmesin diye taşınan durumu temizle
  useEffect(() => {
    window.history.replaceState({}, '')
  }, [])

  useEffect(() => {
    api
      .get('/builds/')
      .then((list) => {
        setBuilds(list)
        setError('')
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [reloadKey])

  function handleSaved() {
    setFormOpen(false)
    setError('')
    setSuccess('Sistem eklendi.')
    reload()
  }

  async function handleDelete(build) {
    const ok = window.confirm(
      `"${build.name}" silinsin mi? Bu sisteme ait profiller ve benchmark sonuçları da silinir.`,
    )
    if (!ok) return
    setError('')
    setSuccess('')
    try {
      await api.delete(`/builds/${build.id}/`)
      setSuccess('Sistem silindi.')
      reload()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2>Sistemlerim</h2>
        {!formOpen && (
          <button className="btn" onClick={() => setFormOpen(true)}>
            Yeni Sistem
          </button>
        )}
      </div>

      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}

      {formOpen && <BuildForm onSaved={handleSaved} onCancel={() => setFormOpen(false)} />}

      {loading ? (
        <p>Yükleniyor...</p>
      ) : builds.length === 0 ? (
        <p>Henüz sistemin yok. "Yeni Sistem" ile ilkini ekle.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Ad</th>
              <th>Tür</th>
              <th>Parça sayısı</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {builds.map((b) => (
              <tr key={b.id}>
                <td>
                  <Link to={`/builds/${b.id}`}>{b.name}</Link>
                </td>
                <td>{b.form_factor}</td>
                <td>{b.components.length}</td>
                <td className="row-actions">
                  <Link className="small-link" to={`/builds/${b.id}`}>
                    Detay
                  </Link>
                  <button className="small danger" onClick={() => handleDelete(b)}>
                    Sil
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
