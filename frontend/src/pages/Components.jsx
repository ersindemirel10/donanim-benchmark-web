import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { useAuth } from '../auth/AuthContext.jsx'
import ComponentForm from './ComponentForm.jsx'

// Saat sütunu: CPU/GPU için "temel / boost", RAM için sadece hız, boşsa "-"
function clockText(c) {
  if (c.base_clock_mhz == null && c.boost_clock_mhz == null) return '-'
  if (c.boost_clock_mhz == null) return c.base_clock_mhz
  if (c.base_clock_mhz == null) return c.boost_clock_mhz
  return `${c.base_clock_mhz} / ${c.boost_clock_mhz}`
}

export default function Components() {
  const { user } = useAuth()

  const [components, setComponents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [typeFilter, setTypeFilter] = useState('')
  const [search, setSearch] = useState('')

  // formOpen: false = kapalı, 'new' = yeni parça, nesne = düzenlenen parça
  const [formOpen, setFormOpen] = useState(false)

  // Listeyi yeniden çekmek için bu sayacı artırırız (kayıt/silme sonrası)
  const [reloadKey, setReloadKey] = useState(0)
  const reload = () => setReloadKey((k) => k + 1)

  useEffect(() => {
    api
      .get('/components/')
      .then((list) => {
        setComponents(list)
        setError('')
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [reloadKey])

  function handleSaved(saved, wasEdit) {
    setFormOpen(false)
    setError('')
    setSuccess(wasEdit ? 'Parça güncellendi.' : 'Parça eklendi.')
    reload()
  }

  async function handleDelete(component) {
    if (!window.confirm(`"${component.brand} ${component.name}" silinsin mi?`)) return
    setError('')
    setSuccess('')
    try {
      await api.delete(`/components/${component.id}/`)
      setSuccess('Parça silindi.')
      reload()
    } catch (err) {
      // örn. 409: parça bir sistemde kullanılıyor, 403: parça başkasına ait
      setError(err.message)
    }
  }

  const visible = components.filter((c) => {
    if (typeFilter && c.type !== typeFilter) return false
    const text = `${c.brand} ${c.name}`.toLowerCase()
    return text.includes(search.toLowerCase())
  })

  return (
    <div>
      <div className="page-header">
        <h2>Parçalar</h2>
        {user && !formOpen && (
          <button className="btn" onClick={() => setFormOpen('new')}>
            Yeni Parça
          </button>
        )}
      </div>

      {!user && <p className="hint">Parça eklemek için giriş yapmalısın.</p>}
      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}

      {formOpen && (
        <ComponentForm
          key={formOpen === 'new' ? 'new' : formOpen.id}
          component={formOpen === 'new' ? null : formOpen}
          onSaved={handleSaved}
          onCancel={() => setFormOpen(false)}
        />
      )}

      <div className="filters">
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">Tüm türler</option>
          <option value="CPU">CPU</option>
          <option value="GPU">GPU</option>
          <option value="RAM">RAM</option>
        </select>
        <input
          placeholder="Marka veya model ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <p>Yükleniyor...</p>
      ) : visible.length === 0 ? (
        <p>Gösterilecek parça yok.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Tür</th>
              <th>Marka</th>
              <th>Model</th>
              <th>Çekirdek</th>
              <th>Saat (MHz)</th>
              <th>TDP (W)</th>
              <th>Maks. °C</th>
              <th>Bellek (GB)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((c) => (
              <tr key={c.id}>
                <td>{c.type}</td>
                <td>{c.brand}</td>
                <td>{c.name}</td>
                <td>{c.cores ?? '-'}</td>
                <td>{clockText(c)}</td>
                <td>{c.tdp_w ?? '-'}</td>
                <td>{c.max_temp_c ?? '-'}</td>
                <td>{c.memory_gb ?? '-'}</td>
                <td className="row-actions">
                  {/* Düzenle/Sil sadece parçayı ekleyen kullanıcıya görünür */}
                  {user && c.created_by === user.id && (
                    <>
                      <button className="small" onClick={() => setFormOpen(c)}>
                        Düzenle
                      </button>
                      <button className="small danger" onClick={() => handleDelete(c)}>
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
