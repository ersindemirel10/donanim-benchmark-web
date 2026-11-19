import { useState } from 'react'
import { api } from '../api.js'
import { useScrollIntoView } from '../useScrollIntoView.js'

const FAN_PROFILES = ['Sessiz', 'Dengeli', 'Performans', 'Maksimum']

function toFormState(profile) {
  return {
    name: profile?.name ?? '',
    cpu_undervolt_mv: profile?.cpu_undervolt_mv ?? '',
    gpu_undervolt_mv: profile?.gpu_undervolt_mv ?? '',
    power_limit_w: profile?.power_limit_w ?? '',
    fan_profile: profile?.fan_profile ?? '',
    notes: profile?.notes ?? '',
  }
}

// Boş bırakılan sayısal alanlar ve fan profili backend'e null gider
function toPayload(form) {
  const num = (v) => (v === '' ? null : Number(v))
  return {
    name: form.name,
    cpu_undervolt_mv: num(form.cpu_undervolt_mv),
    gpu_undervolt_mv: num(form.gpu_undervolt_mv),
    power_limit_w: num(form.power_limit_w),
    fan_profile: form.fan_profile === '' ? null : form.fan_profile,
    notes: form.notes,
  }
}

// profile verilirse düzenleme (PUT), verilmezse yeni profil (POST)
export default function ProfileForm({ buildId, profile, onSaved, onCancel }) {
  const formRef = useScrollIntoView()
  const [form, setForm] = useState(toFormState(profile))
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function change(field, value) {
    setForm({ ...form, [field]: value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const payload = toPayload(form)
      const saved = profile
        ? await api.put(`/profiles/${profile.id}/`, payload)
        : await api.post(`/builds/${buildId}/profiles/`, payload)
      onSaved(saved, Boolean(profile))
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="card" ref={formRef} onSubmit={handleSubmit}>
      <h3>{profile ? 'Profili Düzenle' : 'Yeni Profil'}</h3>
      {error && <p className="error">{error}</p>}

      <div className="grid">
        <label>
          Profil adı
          <input value={form.name} onChange={(e) => change('name', e.target.value)} required />
        </label>
        <label>
          CPU undervolt (mV)
          <input
            type="number"
            step="1"
            min="-250"
            max="0"
            placeholder="-250 ile 0 arası"
            value={form.cpu_undervolt_mv}
            onChange={(e) => change('cpu_undervolt_mv', e.target.value)}
          />
        </label>
        <label>
          GPU undervolt (mV)
          <input
            type="number"
            step="1"
            min="-250"
            max="0"
            placeholder="-250 ile 0 arası"
            value={form.gpu_undervolt_mv}
            onChange={(e) => change('gpu_undervolt_mv', e.target.value)}
          />
        </label>
        <label>
          Güç limiti (W)
          <input
            type="number"
            step="1"
            min="1"
            value={form.power_limit_w}
            onChange={(e) => change('power_limit_w', e.target.value)}
          />
        </label>
        <label>
          Fan profili
          <select value={form.fan_profile} onChange={(e) => change('fan_profile', e.target.value)}>
            <option value="">Seçilmedi</option>
            {FAN_PROFILES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label>
        Not
        <textarea rows="2" value={form.notes} onChange={(e) => change('notes', e.target.value)} />
      </label>

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
