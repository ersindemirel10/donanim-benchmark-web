import { useState } from 'react'
import { api } from '../api.js'

// software verilirse düzenleme (PUT), verilmezse yeni kayıt (POST)
export default function SoftwareForm({ software, onSaved, onCancel }) {
  const [name, setName] = useState(software?.name ?? '')
  const [category, setCategory] = useState(software?.category ?? 'CPU')
  const [scoreUnit, setScoreUnit] = useState(software?.score_unit ?? '')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const payload = { name, category, score_unit: scoreUnit }
      const saved = software
        ? await api.put(`/software/${software.id}/`, payload)
        : await api.post('/software/', payload)
      onSaved(saved, Boolean(software))
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h3>{software ? 'Yazılımı Düzenle' : 'Yeni Yazılım'}</h3>
      {error && <p className="error">{error}</p>}

      <div className="grid">
        <label>
          Ad
          <input
            placeholder="Cinebench R23 Multi Core"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <label>
          Kategori
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="CPU">CPU</option>
            <option value="GPU">GPU</option>
            <option value="Genel">Genel</option>
          </select>
        </label>
        <label>
          Skor birimi
          <input
            placeholder="pts, FPS, %"
            maxLength="16"
            value={scoreUnit}
            onChange={(e) => setScoreUnit(e.target.value)}
          />
        </label>
      </div>

      <p className="hint">
        Program başına değil test başına kayıt aç: örneğin Cinebench R23 Multi Core ve Single Core
        ayrı kayıtlardır. Kıyaslama aynı yazılımın skorları arasında yapılır.
      </p>

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
