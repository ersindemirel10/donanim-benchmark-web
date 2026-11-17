import { useEffect, useState } from 'react'
import { api } from '../api.js'

const TYPES = ['CPU', 'GPU', 'RAM']

// build verilirse düzenleme (PUT), verilmezse yeni sistem (POST)
export default function BuildForm({ build, onSaved, onCancel }) {
  const [name, setName] = useState(build?.name ?? '')
  const [formFactor, setFormFactor] = useState(build?.form_factor ?? 'Laptop')
  const [description, setDescription] = useState(build?.description ?? '')
  const [selected, setSelected] = useState(build?.components ?? []) // parça id listesi

  const [allComponents, setAllComponents] = useState([])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Seçilebilecek parçalar: katalogdaki tüm parçalar
  useEffect(() => {
    api
      .get('/components/')
      .then(setAllComponents)
      .catch((err) => setError(err.message))
  }, [])

  function toggle(id) {
    setSelected(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const payload = {
        name,
        form_factor: formFactor,
        description,
        components: selected,
      }
      const saved = build
        ? await api.put(`/builds/${build.id}/`, payload)
        : await api.post('/builds/', payload)
      onSaved(saved, Boolean(build))
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h3>{build ? 'Sistemi Düzenle' : 'Yeni Sistem'}</h3>
      {error && <p className="error">{error}</p>}

      <div className="grid">
        <label>
          Sistem adı
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Tür
          <select value={formFactor} onChange={(e) => setFormFactor(e.target.value)}>
            <option value="Laptop">Laptop</option>
            <option value="Masaüstü">Masaüstü</option>
          </select>
        </label>
      </div>

      <label>
        Açıklama
        <textarea
          rows="2"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>

      <h4>Parçalar</h4>
      {allComponents.length === 0 && (
        <p className="hint">Henüz parça yok. Önce "Parçalar" sayfasından parça ekle.</p>
      )}
      {TYPES.map((type) => {
        const items = allComponents.filter((c) => c.type === type)
        if (items.length === 0) return null
        return (
          <fieldset key={type} className="picker">
            <legend>{type}</legend>
            {items.map((c) => (
              <label key={c.id} className="check">
                <input
                  type="checkbox"
                  checked={selected.includes(c.id)}
                  onChange={() => toggle(c.id)}
                />
                {c.brand} {c.name}
              </label>
            ))}
          </fieldset>
        )
      })}

      <div className="actions">
        <button type="submit" disabled={submitting}>
          {submitting ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
        <button type="button" className="secondary" onClick={onCancel}>
          Vazgeç
        </button>
      </div>
    </form>
  )
}
