import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import { useAuth } from '../auth/AuthContext.jsx'

// Hero'daki örnek: aynı parça sınırı (95 °C) iki farklı test sonucuyla.
// Ölçek 40-110 °C arası; konum yüzdesi bu ölçekten hesaplanır.
const SCALE_MIN = 40
const SCALE_MAX = 110
const LIMIT_C = 95

function position(temp) {
  return ((temp - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100
}

const EXAMPLES = [
  { name: 'Test A', temp: 82, note: 'Sınırın 13 °C altında, throttle yok.' },
  { name: 'Test B', temp: 96, note: 'Sınırı aştı, test throttle işaretlenir.', hot: true },
]

const STEPS = [
  {
    title: 'Parça ekle',
    text: 'CPU, GPU ve RAM kataloğuna parçanı ve termal sınırını (maksimum sıcaklık) gir.',
    to: '/components',
  },
  {
    title: 'Sistem kur',
    text: 'Parçalarını bir sistemde birleştir. Laptop ya da masaüstü olabilir.',
    to: '/builds',
  },
  {
    title: 'Profil oluştur',
    text: 'Undervolt, güç limiti ve fan profiliyle sistemin farklı ayarlarını kaydet.',
  },
  {
    title: 'Test sonucu ekle',
    text: 'Yazılımı, skoru ve sıcaklıkları gir. Sıcaklık parçanın sınırına ulaşırsa throttle otomatik işaretlenir.',
  },
  {
    title: 'Kıyasla',
    text: 'Aynı yazılımda profilleri ortalama skora göre sırala, hangi ayarın daha iyi olduğunu gör.',
  },
]

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
    <div className="home">
      {error && <p className="error">{error}</p>}

      <section className="home-hero">
        <div className="home-intro">
          <h1>Parçaların sınırında mı çalışıyor?</h1>
          <p>
            Sistemini ve ayar profillerini kaydet, benchmark sonuçlarını kıyasla. Sıcaklık
            parçanın termal sınırına ulaşınca test otomatik olarak throttle işaretlenir.
          </p>
          <div className="home-actions">
            {user ? (
              <>
                <Link className="home-btn" to="/builds">Sistemlerime git</Link>
                <Link className="home-btn home-btn-ghost" to="/components">Parçalara bak</Link>
              </>
            ) : (
              <>
                <Link className="home-btn" to="/register">Kayıt ol</Link>
                <Link className="home-btn home-btn-ghost" to="/login">Giriş yap</Link>
              </>
            )}
          </div>
          <p className="home-stats">
            <span><strong>{componentCount ?? '...'}</strong> kayıtlı parça</span>
            {user && <span><strong>{buildCount ?? '...'}</strong> sistemin</span>}
          </p>
        </div>

        <figure className="thermal" aria-label="Örnek: aynı parça iki testte, sınır 95 derece">
          <figcaption>
            Örnek: parça sınırı <strong>{LIMIT_C} °C</strong>
          </figcaption>
          {EXAMPLES.map((ex) => (
            <div className="thermal-row" key={ex.name}>
              <div className="thermal-head">
                <span>{ex.name}</span>
                <strong className={ex.hot ? 'hot' : ''}>{ex.temp} °C</strong>
              </div>
              <div className="thermal-track">
                <span className="thermal-limit" style={{ left: `${position(LIMIT_C)}%` }} />
                <span
                  className={ex.hot ? 'thermal-dot hot' : 'thermal-dot'}
                  style={{ left: `${position(ex.temp)}%` }}
                />
              </div>
              <p>{ex.note}</p>
            </div>
          ))}
        </figure>
      </section>

      <section className="home-flow">
        <h2>Nasıl çalışır</h2>
        <ol className="home-steps">
          {STEPS.map((step) => (
            <li key={step.title}>
              <h3>{step.to ? <Link to={step.to}>{step.title}</Link> : step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
