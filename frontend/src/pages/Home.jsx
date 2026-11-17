import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import { useAuth } from '../auth/AuthContext.jsx'

export default function Home() {
  const { user } = useAuth()
  const [componentCount, setComponentCount] = useState(null)
  const [buildCount, setBuildCount] = useState(null)
  const [error, setError] = useState('')

  // Herkese açık parça listesi: katalogdaki parça sayısı
  useEffect(() => {
    api
      .get('/components/')
      .then((list) => setComponentCount(list.length))
      .catch((err) => setError(err.message))
  }, [])

  // Giriş yapmış kullanıcının sistem sayısı
  useEffect(() => {
    if (!user) return
    api
      .get('/builds/')
      .then((list) => setBuildCount(list.length))
      .catch((err) => setError(err.message))
  }, [user])

  return (
    <div>
      <h1>PC Donanım, Termal Analiz ve Benchmark Veritabanı</h1>
      <p>
        Parçalarını ve sistemlerini kaydet, undervolt profilleri dene, benchmark sonuçlarını
        kıyasla. Ölçülen sıcaklık parçanın termal sınırına ulaşırsa test otomatik olarak
        "throttle" işaretlenir.
      </p>

      {error && <p className="error">{error}</p>}

      <div className="summary">
        <div className="card">
          <h3>{componentCount ?? '...'}</h3>
          <p>Kayıtlı parça</p>
          <Link to="/components">Parçalara git</Link>
        </div>

        {user ? (
          <div className="card">
            <h3>{buildCount ?? '...'}</h3>
            <p>Sistemin</p>
            <Link to="/builds">Sistemlerime git</Link>
          </div>
        ) : (
          <div className="card">
            <h3>Başla</h3>
            <p>Sistem eklemek ve test kaydetmek için giriş yap.</p>
            <Link to="/login">Giriş</Link> · <Link to="/register">Kayıt</Link>
          </div>
        )}
      </div>
    </div>
  )
}
