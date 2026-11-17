import { useState } from 'react'
import { api } from '../api.js'

// Sayısal alanların etiketleri
const LABELS = {
  cores: 'Çekirdek sayısı',
  base_clock_mhz: 'Temel saat (MHz)',
  boost_clock_mhz: 'Boost saat (MHz)',
  tdp_w: 'TDP (W)',
  max_temp_c: 'Maksimum sıcaklık (°C)',
  memory_gb: 'Bellek (GB)',
}

// Parça türüne göre anlamlı alanlar. Diğerleri formda gösterilmez ve backend'e null gider.
// (Termal sınır sadece CPU/GPU için kullanılır, RAM'de saat alanı "hız" anlamına gelir.)
const FIELDS_BY_TYPE = {
  CPU: ['cores', 'base_clock_mhz', 'boost_clock_mhz', 'tdp_w', 'max_temp_c'],
  GPU: ['cores', 'base_clock_mhz', 'boost_clock_mhz', 'tdp_w', 'max_temp_c', 'memory_gb'],
  RAM: ['base_clock_mhz', 'memory_gb'],
}

function labelFor(type, field) {
  if (type === 'RAM' && field === 'base_clock_mhz') return 'Hız (MHz)'
  if (type === 'GPU' && field === 'memory_gb') return 'Bellek / VRAM (GB)'
  return LABELS[field]
}

const ALL_FIELDS = Object.keys(LABELS)

function toFormState(component) {
  const state = {
    type: component?.type ?? 'CPU',
    brand: component?.brand ?? '',
    name: component?.name ?? '',
  }
  for (const field of ALL_FIELDS) {
    state[field] = component?.[field] ?? ''
  }
  return state
}

function toPayload(form) {
  const payload = { type: form.type, brand: form.brand, name: form.name }
  const visible = FIELDS_BY_TYPE[form.type]
  for (const field of ALL_FIELDS) {
    // Türe uymayan alanlar (örn. RAM'de çekirdek) her zaman null gönderilir
    payload[field] = visible.includes(field) && form[field] !== '' ? Number(form[field]) : null
  }
  return payload
}

// component verilirse düzenleme (PUT), verilmezse yeni kayıt (POST)
export default function ComponentForm({ component, onSaved, onCancel }) {
  const [form, setForm] = useState(toFormState(component))
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
      const saved = component
        ? await api.put(`/components/${component.id}/`, payload)
        : await api.post('/components/', payload)
      onSaved(saved, Boolean(component))
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h3>{component ? 'Parçayı Düzenle' : 'Yeni Parça'}</h3>
      {error && <p className="error">{error}</p>}

      <div className="grid">
        <label>
          Tür
          <select value={form.type} onChange={(e) => change('type', e.target.value)}>
            <option value="CPU">CPU</option>
            <option value="GPU">GPU</option>
            <option value="RAM">RAM</option>
          </select>
        </label>
        <label>
          Marka
          <input value={form.brand} onChange={(e) => change('brand', e.target.value)} required />
        </label>
        <label>
          Model adı
          <input value={form.name} onChange={(e) => change('name', e.target.value)} required />
        </label>

        {FIELDS_BY_TYPE[form.type].map((field) => (
          <label key={field}>
            {labelFor(form.type, field)}
            <input
              type="number"
              min="0"
              value={form[field]}
              onChange={(e) => change(field, e.target.value)}
            />
          </label>
        ))}
      </div>

      {form.type !== 'RAM' && (
        <p className="hint">
          Maksimum sıcaklık, bu parçanın termal sınırıdır. Benchmark sırasında ölçülen sıcaklık bu
          değere ulaşırsa test otomatik olarak "throttle" işaretlenir.
        </p>
      )}

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
