import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api.js'
import BuildForm from './BuildForm.jsx'

export default function BuildDetail() {
  const { id } = useParams() // adresteki /builds/:id kısmı
  const navigate = useNavigate()

  const [build, setBuild] = useState(null)
  const [components, setComponents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editing, setEditing] = useState(false)

  // Sistem ve parça kataloğu birlikte çekilir (parça id'lerini isme çevirmek için)
  useEffect(() => {
    Promise.all([api.get(`/builds/${id}/`), api.get('/components/')])
      .then(([buildData, componentList]) => {
        setBuild(buildData)
        setComponents(componentList)
      })
      .catch((err) => setError(err.message)) // 404: yok, 403: başkasına ait
      .finally(() => setLoading(false))
  }, [id])

  function handleSaved(saved) {
    setBuild(saved)
    setEditing(false)
    setError('')
    setSuccess('Sistem güncellendi.')
  }

  async function handleDelete() {
    const ok = window.confirm(
      `"${build.name}" silinsin mi? Bu sisteme ait profiller ve benchmark sonuçları da silinir.`,
    )
    if (!ok) return
    try {
      await api.delete(`/builds/${build.id}/`)
      navigate('/builds')
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <p>Yükleniyor...</p>

  if (!build) {
    return (
      <div>
        <p className="error">{error || 'Sistem bulunamadı.'}</p>
        <Link to="/builds">Sistemlerime dön</Link>
      </div>
    )
  }

  const byId = Object.fromEntries(components.map((c) => [c.id, c]))

  return (
    <div>
      <p>
        <Link to="/builds">← Sistemlerim</Link>
      </p>

      <div className="page-header">
        <h2>{build.name}</h2>
        {!editing && (
          <div className="actions">
            <button className="btn" onClick={() => setEditing(true)}>
              Düzenle
            </button>
            <button className="btn danger-btn" onClick={handleDelete}>
              Sil
            </button>
          </div>
        )}
      </div>

      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}

      {editing ? (
        <BuildForm build={build} onSaved={handleSaved} onCancel={() => setEditing(false)} />
      ) : (
        <div className="card">
          <p>
            <strong>Tür:</strong> {build.form_factor}
          </p>
          <p>
            <strong>Açıklama:</strong> {build.description || '-'}
          </p>
          <h4>Parçalar</h4>
          {build.components.length === 0 ? (
            <p className="hint">Bu sisteme henüz parça eklenmemiş.</p>
          ) : (
            <ul>
              {build.components.map((cid) => {
                const c = byId[cid]
                return (
                  <li key={cid}>
                    {c ? `${c.type}: ${c.brand} ${c.name}` : `Parça #${cid}`}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
