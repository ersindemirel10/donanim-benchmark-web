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
  cas_latency: 'CAS gecikmesi (CL)',
}

// Backend'deki sınırlarla aynı (sayı alanlarının min/max değerleri)
const RANGES = {
  cas_latency: { min: 9, max: 70 },
}

// Parça türüne göre anlamlı alanlar. Diğerleri formda gösterilmez ve backend'e null gider.
// (Termal sınır sadece CPU/GPU için kullanılır, RAM'de saat alanı "hız" anlamına gelir.)
const FIELDS_BY_TYPE = {
  CPU: ['cores', 'base_clock_mhz', 'boost_clock_mhz', 'tdp_w', 'max_temp_c'],
  GPU: ['base_clock_mhz', 'boost_clock_mhz', 'tdp_w', 'max_temp_c', 'memory_gb'],
  RAM: ['base_clock_mhz', 'memory_gb', 'cas_latency'],
}

// Zorunlu alanlar (backend'deki REQUIRED_BY_TYPE ile aynı). Diğerleri isteğe bağlıdır.
const REQUIRED_BY_TYPE = {
  CPU: ['base_clock_mhz', 'tdp_w'],
  GPU: ['tdp_w', 'memory_gb'],
  RAM: ['base_clock_mhz', 'memory_gb', 'cas_latency'],
}

function labelFor(type, field) {
  if (type === 'RAM' && field === 'base_clock_mhz') return 'Hız (MHz)'
  if (type === 'GPU' && field === 'memory_gb') return 'Bellek / VRAM (GB)'
  return LABELS[field]
}

const ALL_FIELDS = Object.keys(LABELS)

// CPU ve GPU için popüler markalar listeden seçilir, listede yoksa "Diğer" ile elle yazılır.
// RAM'de marka çok çeşitli olduğu için serbest metin kalır.
const BRANDS = {
  CPU: ['Intel', 'AMD'],
  GPU: ['NVIDIA', 'AMD', 'Intel'],
}
const OTHER = '__other__'

// Select'te hangi seçeneğin görüneceği: listedeki marka, "Diğer" ya da boş
function brandChoiceFor(type, brand) {
  if (!BRANDS[type] || !brand) return ''
  return BRANDS[type].includes(brand) ? brand : OTHER
}

// RAM'in model adı sorulmaz, özelliklerinden üretilir. Örn: DDR5-6000 CL30 16GB
function ramName(form) {
  return `${form.memory_type}-${form.base_clock_mhz} CL${form.cas_latency} ${form.memory_gb}GB`
}

function toFormState(component) {
  const state = {
    type: component?.type ?? 'CPU',
    brand: component?.brand ?? '',
    name: component?.name ?? '',
    memory_type: component?.memory_type ?? '',
  }
  for (const field of ALL_FIELDS) {
    state[field] = component?.[field] ?? ''
  }
  return state
}

function toPayload(form) {
  const isRam = form.type === 'RAM'
  const payload = {
    type: form.type,
    brand: form.brand,
    name: isRam ? ramName(form) : form.name,
    memory_type: isRam ? form.memory_type : null,
  }
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
  const [brandChoice, setBrandChoice] = useState(
    brandChoiceFor(component?.type ?? 'CPU', component?.brand ?? ''),
  )
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function change(field, value) {
    setForm({ ...form, [field]: value })
  }

  function changeType(type) {
    // Listeden seçilmiş bir marka, yeni türün listesinde yoksa taşınmaz (örn. NVIDIA → CPU,
    // Intel → RAM). Elle yazılmış ("Diğer" ya da RAM'deki) marka her zaman korunur.
    const pickedFromList = Boolean(BRANDS[form.type]) && brandChoice !== OTHER
    const brand = pickedFromList && !BRANDS[type]?.includes(form.brand) ? '' : form.brand
    setForm({ ...form, type, brand })
    setBrandChoice(brandChoiceFor(type, brand))
  }

  function changeBrandChoice(choice) {
    setBrandChoice(choice)
    // "Diğer" seçilince marka elle yazılacak; listeden seçilince değer hemen belli olur
    setForm({ ...form, brand: choice === OTHER ? '' : choice })
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
          <select value={form.type} onChange={(e) => changeType(e.target.value)}>
            <option value="CPU">CPU</option>
            <option value="GPU">GPU</option>
            <option value="RAM">RAM</option>
          </select>
        </label>
        {BRANDS[form.type] ? (
          <>
            <label>
              Marka
              <select
                value={brandChoice}
                onChange={(e) => changeBrandChoice(e.target.value)}
                required
              >
                <option value="">Seçiniz</option>
                {BRANDS[form.type].map((brand) => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
                <option value={OTHER}>Diğer</option>
              </select>
            </label>
            {brandChoice === OTHER && (
              <label>
                Marka adı
                <input
                  value={form.brand}
                  onChange={(e) => change('brand', e.target.value)}
                  required
                />
              </label>
            )}
          </>
        ) : (
          <label>
            Marka
            <input value={form.brand} onChange={(e) => change('brand', e.target.value)} required />
          </label>
        )}
        {form.type !== 'RAM' && (
          <label>
            Model adı
            <input value={form.name} onChange={(e) => change('name', e.target.value)} required />
          </label>
        )}
        {form.type === 'RAM' && (
          <label>
            Bellek türü
            <select
              value={form.memory_type}
              onChange={(e) => change('memory_type', e.target.value)}
              required
            >
              <option value="">Seçiniz</option>
              <option value="DDR4">DDR4</option>
              <option value="DDR5">DDR5</option>
            </select>
          </label>
        )}

        {FIELDS_BY_TYPE[form.type].map((field) => (
          <label key={field}>
            {labelFor(form.type, field)}
            {!REQUIRED_BY_TYPE[form.type].includes(field) && ' (isteğe bağlı)'}
            <input
              type="number"
              min={RANGES[field]?.min ?? 0}
              max={RANGES[field]?.max}
              required={REQUIRED_BY_TYPE[form.type].includes(field)}
              value={form[field]}
              onChange={(e) => change(field, e.target.value)}
            />
          </label>
        ))}
      </div>

      {form.type === 'RAM' && (
        <p className="hint">
          Model adı sorulmaz, özelliklerden otomatik oluşturulur
          {form.memory_type && form.base_clock_mhz && form.cas_latency && form.memory_gb
            ? `: ${ramName(form)}`
            : '.'}{' '}
          CAS gecikmesi (CL) 9 ile 70 arasında olmalı.
        </p>
      )}
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
