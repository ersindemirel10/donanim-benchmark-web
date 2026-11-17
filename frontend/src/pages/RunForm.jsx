import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'

// Sayısal ölçüm alanları: [alan adı, etiket, min, max]
const MEASURE_FIELDS = [
  ['max_cpu_temp_c', 'Maks. CPU sıcaklığı (°C)', 0, 150],
  ['max_gpu_temp_c', 'Maks. GPU sıcaklığı (°C)', 0, 150],
  ['avg_cpu_clock_mhz', 'Ort. CPU saati (MHz)', 0, 10000],
  ['avg_gpu_clock_mhz', 'Ort. GPU saati (MHz)', 0, 10000],
  ['ambient_temp_c', 'Ortam sıcaklığı (°C)', -50, 60],
]

// Not: throttled / throttle_reason alanları formda yok, backend hesaplar.
export default function RunForm({ buildId, profiles, softwareList, onSaved, onCancel }) {
  const [softwareId, setSoftwareId] = useState('')
  const [score, setScore] = useState('')
  const [profile, setProfile] = useState('')
  const [notes, setNotes] = useState('')
  const [measures, setMeasures] = useState({})
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Seçilen yazılımın skor birimi (etikette gösterilir)
  const unit = softwareList.find((s) => String(s.id) === softwareId)?.score_unit

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const payload = {
        software: Number(softwareId),
        score: Number(score),
        profile: profile === '' ? null : Number(profile),
        notes,
      }
      for (const [field] of MEASURE_FIELDS) {
        const v = measures[field]
        payload[field] = v === undefined || v === '' ? null : Number(v)
      }
      const saved = await api.post(`/builds/${buildId}/runs/`, payload)
      onSaved(saved)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h3>Yeni Test Sonucu</h3>
      {error && <p className="error">{error}</p>}

      <div className="grid">
        <label>
          Yazılım
          <select value={softwareId} onChange={(e) => setSoftwareId(e.target.value)} required>
            <option value="">Seçiniz</option>
            {softwareList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Skor{unit ? ` (${unit})` : ''}
          <input
            type="number"
            step="any"
            min="0"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            required
          />
        </label>
        <label>
          Profil
          <select value={profile} onChange={(e) => setProfile(e.target.value)}>
            <option value="">Profilsiz</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        {MEASURE_FIELDS.map(([field, label, min, max]) => (
          <label key={field}>
            {label}
            <input
              type="number"
              step="1"
              min={min}
              max={max}
              value={measures[field] ?? ''}
              onChange={(e) => setMeasures({ ...measures, [field]: e.target.value })}
            />
          </label>
        ))}
      </div>

      <label>
        Not
        <textarea rows="2" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>

      {softwareList.length === 0 && (
        <p className="hint">
          Henüz yazılım yok. Önce <Link to="/software">Yazılımlar</Link> sayfasından ekle.
        </p>
      )}
      <p className="hint">
        Throttle durumu sen girmezsin: ölçtüğün sıcaklık parçanın maksimum sıcaklığına
        ulaşırsa sistem bunu kaydederken otomatik işaretler.
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
