import { useState } from 'react'
import { api } from '../api.js'

// Sayısal alanlar: form boş bırakılırsa backend'e null gider
const NUMBER_FIELDS = [
  ['cores', 'Çekirdek sayısı'],
  ['base_clock_mhz', 'Temel saat (MHz)'],
  ['boost_clock_mhz', 'Boost saat (MHz)'],
  ['tdp_w', 'TDP (W)'],
  ['max_temp_c', 'Maksimum sıcaklık (°C)'],
  ['memory_gb', 'Bellek (GB)'],
]

function toFormState(component) {
  const state = {
    type: component?.type ?? 'CPU',
    brand: component?.brand ?? '',
    name: component?.name ?? '',
  }
  for (const [field] of NUMBER_FIELDS) {
    state[field] = component?.[field] ?? ''
  }
  return state
}

function toPayload(form) {
  const payload = { type: form.type, brand: form.brand, name: form.name }
  for (const [field] of NUMBER_FIELDS) {
    payload[field] = form[field] === '' ? null : Number(form[field])
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

        {NUMBER_FIELDS.map(([field, label]) => (
          <label key={field}>
            {label}
            <input
              type="number"
              min="0"
              value={form[field]}
              onChange={(e) => change(field, e.target.value)}
            />
          </label>
        ))}
      </div>

      <p className="hint">
        Maksimum sıcaklık, bu parçanın termal sınırıdır. Benchmark sırasında ölçülen sıcaklık bu
        değere ulaşırsa test otomatik olarak "throttle" işaretlenir.
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
