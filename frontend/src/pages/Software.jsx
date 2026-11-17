import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { useAuth } from '../auth/AuthContext.jsx'
import SoftwareForm from './SoftwareForm.jsx'

export default function Software() {
  const { user } = useAuth()

  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [categoryFilter, setCategoryFilter] = useState('')
  const [search, setSearch] = useState('')

  // formOpen: false = kapalı, 'new' = yeni yazılım, nesne = düzenlenen yazılım
  const [formOpen, setFormOpen] = useState(false)

  // Listeyi yeniden çekmek için bu sayacı artırırız (kayıt/silme sonrası)
  const [reloadKey, setReloadKey] = useState(0)
  const reload = () => setReloadKey((k) => k + 1)

  useEffect(() => {
    api
      .get('/software/')
      .then((data) => {
        setList(data)
        setError('')
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [reloadKey])

  function handleSaved(saved, wasEdit) {
    setFormOpen(false)
    setError('')
    setSuccess(wasEdit ? 'Yazılım güncellendi.' : 'Yazılım eklendi.')
    reload()
  }

  async function handleDelete(item) {
    if (!window.confirm(`"${item.name}" silinsin mi?`)) return
    setError('')
    setSuccess('')
    try {
      await api.delete(`/software/${item.id}/`)
      setSuccess('Yazılım silindi.')
      reload()
    } catch (err) {
      // örn. 409: yazılım test sonuçlarında kullanılıyor, 403: başkasına ait
      setError(err.message)
    }
  }

  const visible = list.filter((s) => {
    if (categoryFilter && s.category !== categoryFilter) return false
    return s.name.toLowerCase().includes(search.toLowerCase())
  })

  // Kaydı kimin eklediği: hazır kayıtların sahibi yoktur
  function ownerText(item) {
    if (item.created_by === null) return 'Hazır kayıt'
    return user && item.created_by === user.id ? 'Sen' : 'Başka kullanıcı'
  }

  return (
    <div>
      <div className="page-header">
        <h2>Benchmark Yazılımları</h2>
        {user && !formOpen && (
          <button className="btn" onClick={() => setFormOpen('new')}>
            Yeni Yazılım
          </button>
        )}
      </div>

      <p className="hint">
        Test sonuçları bu listeden seçilen yazılıma bağlanır. Hazır kayıtlar ve başkalarının
        eklediği kayıtlar değiştirilemez.
        {!user && ' Yazılım eklemek için giriş yapmalısın.'}
      </p>
      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}

      {formOpen && (
        <SoftwareForm
          software={formOpen === 'new' ? null : formOpen}
          onSaved={handleSaved}
          onCancel={() => setFormOpen(false)}
        />
      )}

      <div className="filters">
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">Tüm kategoriler</option>
          <option value="CPU">CPU</option>
          <option value="GPU">GPU</option>
          <option value="Genel">Genel</option>
        </select>
        <input
          placeholder="Yazılım ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <p>Yükleniyor...</p>
      ) : visible.length === 0 ? (
        <p>Gösterilecek yazılım yok.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Ad</th>
              <th>Kategori</th>
              <th>Skor birimi</th>
              <th>Ekleyen</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{s.category}</td>
                <td>{s.score_unit || '-'}</td>
                <td>{ownerText(s)}</td>
                <td className="row-actions">
                  {/* Düzenle/Sil sadece yazılımı ekleyen kullanıcıya görünür */}
                  {user && s.created_by === user.id && (
                    <>
                      <button className="small" onClick={() => setFormOpen(s)}>
                        Düzenle
                      </button>
                      <button className="small danger" onClick={() => handleDelete(s)}>
                        Sil
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
