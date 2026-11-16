import { useEffect, useState } from 'react'
import { api } from '../api.js'

export default function Home() {
  const [count, setCount] = useState(null)
  const [error, setError] = useState('')

  // Backend bağlantısını denemek için herkese açık parça listesini çeker
  useEffect(() => {
    api
      .get('/components/')
      .then((list) => setCount(list.length))
      .catch((err) => setError(err.message))
  }, [])

  return (
    <div>
      <h1>PC Donanım, Termal Analiz ve Benchmark Veritabanı</h1>
      <p>Parçalarını ve sistemlerini kaydet, undervolt profilleri dene, benchmark sonuçlarını kıyasla.</p>

      {error && <p className="error">{error}</p>}
      {count !== null && <p className="success">Backend bağlantısı çalışıyor. Kayıtlı parça sayısı: {count}</p>}
      {count === null && !error && <p>Yükleniyor...</p>}
    </div>
  )
}
