import { useEffect, useState } from 'react'
import { api } from '../api.js'
import ProfileForm from './ProfileForm.jsx'

export default function ProfilesTab({ buildId }) {
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // formOpen: false = kapalı, 'new' = yeni profil, nesne = düzenlenen profil
  const [formOpen, setFormOpen] = useState(false)

  // Listeyi yeniden çekmek için bu sayacı artırırız (kayıt/silme sonrası)
  const [reloadKey, setReloadKey] = useState(0)
  const reload = () => setReloadKey((k) => k + 1)

  useEffect(() => {
    api
      .get(`/builds/${buildId}/profiles/`)
      .then((list) => {
        setProfiles(list)
        setError('')
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [buildId, reloadKey])

  function handleSaved(saved, wasEdit) {
    setFormOpen(false)
    setError('')
    setSuccess(wasEdit ? 'Profil güncellendi.' : 'Profil eklendi.')
    reload()
  }

  async function handleDelete(profile) {
    const ok = window.confirm(
      `"${profile.name}" silinsin mi? Bu profille kaydedilmiş testler silinmez, profilsiz kalır.`,
    )
    if (!ok) return
    setError('')
    setSuccess('')
    try {
      await api.delete(`/profiles/${profile.id}/`)
      setSuccess('Profil silindi.')
      reload()
    } catch (err) {
      setError(err.message)
    }
  }

  const show = (v) => (v === null || v === undefined ? '-' : v)

  return (
    <div>
      <div className="page-header">
        <h3>Ayar Profilleri</h3>
        {!formOpen && (
          <button className="btn" onClick={() => setFormOpen('new')}>
            Yeni Profil
          </button>
        )}
      </div>

      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}

      {formOpen && (
        <ProfileForm
          key={formOpen === 'new' ? 'new' : formOpen.id}
          buildId={buildId}
          profile={formOpen === 'new' ? null : formOpen}
          onSaved={handleSaved}
          onCancel={() => setFormOpen(false)}
        />
      )}

      {loading ? (
        <p>Yükleniyor...</p>
      ) : profiles.length === 0 ? (
        <p>Bu sistem için henüz profil yok. Örn. "Stok" ve "Undervolt -100" profilleri ekleyip testlerini kıyaslayabilirsin.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Ad</th>
              <th>CPU mV</th>
              <th>GPU mV</th>
              <th>Güç (W)</th>
              <th>Fan</th>
              <th>Not</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{show(p.cpu_undervolt_mv)}</td>
                <td>{show(p.gpu_undervolt_mv)}</td>
                <td>{show(p.power_limit_w)}</td>
                <td>{show(p.fan_profile)}</td>
                <td>{p.notes || '-'}</td>
                <td className="row-actions">
                  <button className="small" onClick={() => setFormOpen(p)}>
                    Düzenle
                  </button>
                  <button className="small danger" onClick={() => handleDelete(p)}>
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
