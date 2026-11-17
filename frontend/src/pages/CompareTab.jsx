import { useEffect, useState } from 'react'
import { api } from '../api.js'

export default function CompareTab({ buildId }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Sekme her açıldığında veri yeniden çekilir, yani güncel testleri gösterir
  useEffect(() => {
    api
      .get(`/builds/${buildId}/compare/`)
      .then((data) => setRows(data.rows))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [buildId])

  if (loading) return <p>Yükleniyor...</p>
  if (error) return <p className="error">{error}</p>

  if (rows.length === 0) {
    return (
      <div>
        <h3>Profil Kıyaslama</h3>
        <p>Kıyaslama için önce "Testler" sekmesinden test sonucu eklemelisin.</p>
      </div>
    )
  }

  // Backend satırları ortalama skora göre azalan sırada verir: ilk satırın skoru en yüksektir.
  // Eşit skorlu birden fazla profil olabilir, rozet hepsine gösterilir.
  const bestScore = rows[0].avg_score
  const show = (v) => (v === null || v === undefined ? '-' : v)

  return (
    <div>
      <h3>Profil Kıyaslama</h3>
      <p className="hint">
        Testler profile göre gruplanır. Ortalama skor, o profille kaydedilen tüm testlerin
        ortalamasıdır; farklı yazılımların skorlarını karıştırmamak için kıyasta aynı
        yazılımı kullanmak daha doğru olur.
      </p>

      <table>
        <thead>
          <tr>
            <th>Profil</th>
            <th>Test sayısı</th>
            <th>Ort. skor</th>
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
                  <div className="bar-fill" style={{ width: `${(r.avg_score / bestScore) * 100}%` }} />
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
    </div>
  )
}
