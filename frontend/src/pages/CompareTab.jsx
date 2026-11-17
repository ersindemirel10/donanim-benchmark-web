import { useEffect, useMemo, useState } from 'react'
import { api } from '../api.js'

export default function CompareTab({ buildId }) {
  const [runs, setRuns] = useState(null) // null: henüz yüklenmedi
  const [selected, setSelected] = useState('') // kullanıcının seçtiği yazılım id'si
  const [data, setData] = useState(null) // kıyas cevabı
  const [error, setError] = useState('')

  // 1) Sistemin testleri çekilir: hangi yazılımlarla test yapıldığını bulmak için
  useEffect(() => {
    api
      .get(`/builds/${buildId}/runs/`)
      .then(setRuns)
      .catch((err) => setError(err.message))
  }, [buildId])

  // Testlerden yazılım listesi: id, ad, birim ve test sayısı
  const options = useMemo(() => {
    const map = new Map()
    for (const r of runs ?? []) {
      const item = map.get(r.software) ?? {
        id: r.software,
        name: r.software_name,
        unit: r.score_unit,
        count: 0,
      }
      item.count += 1
      map.set(r.software, item)
    }
    return [...map.values()]
  }, [runs])

  // Seçim yapılmadıysa sistemin en çok test ettiği yazılım kullanılır
  const activeId = useMemo(() => {
    if (selected) return selected
    if (options.length === 0) return ''
    const top = options.reduce((best, o) => (o.count > best.count ? o : best))
    return String(top.id)
  }, [selected, options])

  // 2) Seçili yazılım için profil kıyaslaması çekilir
  useEffect(() => {
    if (!activeId) return
    api
      .get(`/builds/${buildId}/compare/?software=${activeId}`)
      .then((result) => {
        setData(result)
        setError('')
      })
      .catch((err) => setError(err.message))
  }, [buildId, activeId])

  if (error) return <p className="error">{error}</p>
  if (runs === null) return <p>Yükleniyor...</p>

  if (options.length === 0) {
    return (
      <div>
        <h3>Profil Kıyaslama</h3>
        <p>Kıyaslama için önce "Testler" sekmesinden test sonucu eklemelisin.</p>
      </div>
    )
  }

  // Seçilen yazılımın cevabı henüz gelmediyse (ya da eski yazılımın cevabı duruyorsa) bekle
  const ready = data && String(data.software_id) === String(activeId)
  const rows = ready ? data.rows : []
  const unit = ready && data.score_unit ? ` (${data.score_unit})` : ''
  const show = (v) => (v === null || v === undefined ? '-' : v)

  // Backend satırları ortalama skora göre azalan sırada verir: ilk satırın skoru en yüksektir.
  // Eşit skorlu birden fazla profil olabilir, rozet hepsine gösterilir.
  const bestScore = rows.length > 0 ? rows[0].avg_score : 0

  return (
    <div>
      <h3>Profil Kıyaslama</h3>

      <label className="inline-label">
        Yazılım
        <select value={activeId} onChange={(e) => setSelected(e.target.value)}>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name} ({o.count} test)
            </option>
          ))}
        </select>
      </label>
      <p className="hint">
        Testler seçilen yazılım için profile göre gruplanır. Farklı yazılımların skorları
        birbirine karıştırılmaz.
      </p>

      {!ready ? (
        <p>Yükleniyor...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Profil</th>
              <th>Test sayısı</th>
              <th>Ort. skor{unit}</th>
              <th>Maks. CPU °C</th>
              <th>Maks. GPU °C</th>
              <th>Throttle</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.profile_id ?? 'none'}>
                <td>
                  {r.profile_name ?? 'Profilsiz'}
                  {r.avg_score === bestScore && rows.length > 1 && (
                    <span className="badge ok best">En yüksek ort. skor</span>
                  )}
                </td>
                <td>{r.run_count}</td>
                <td>
                  {r.avg_score}
                  <div className="bar">
                    <div
                      className="bar-fill"
                      style={{ width: `${bestScore > 0 ? (r.avg_score / bestScore) * 100 : 0}%` }}
                    />
                  </div>
                </td>
                <td>{show(r.max_cpu_temp)}</td>
                <td>{show(r.max_gpu_temp)}</td>
                <td>
                  {r.throttled_count > 0 ? (
                    <span className="badge bad">
                      {r.throttled_count} / {r.run_count}
                    </span>
                  ) : (
                    <span className="badge ok">0 / {r.run_count}</span>
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
