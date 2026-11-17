import { Link, NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import { useAuth } from './auth/AuthContext.jsx'
import ProtectedRoute from './auth/ProtectedRoute.jsx'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Builds from './pages/Builds.jsx'
import BuildDetail from './pages/BuildDetail.jsx'
import Components from './pages/Components.jsx'
import Software from './pages/Software.jsx'

function NotFound() {
  return (
    <div>
      <h2>Sayfa bulunamadı</h2>
      <p>Aradığınız adres yok.</p>
      <Link to="/">Ana sayfaya dön</Link>
    </div>
  )
}

export default function App() {
  const { user, logout, offline, retry } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <>
      <nav className="navbar">
        <span className="brand">Donanım Benchmark</span>
        <NavLink to="/" end>Ana Sayfa</NavLink>
        <NavLink to="/components">Parçalar</NavLink>
        <NavLink to="/software">Yazılımlar</NavLink>
        {user && <NavLink to="/builds">Sistemlerim</NavLink>}
        <span className="spacer" />
        {user ? (
          <>
            <span className="username">{user.username}</span>
            <button className="link-button" onClick={handleLogout}>Çıkış</button>
          </>
        ) : (
          <>
            <NavLink to="/login">Giriş</NavLink>
            <NavLink to="/register">Kayıt</NavLink>
          </>
        )}
      </nav>

      <main className="container">
        {offline && (
          <p className="warning">
            Sunucuya ulaşılamıyor. Oturum bilgin korunuyor.{' '}
            <button className="small" onClick={retry}>
              Tekrar dene
            </button>
          </p>
        )}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/components" element={<Components />} />
          <Route path="/software" element={<Software />} />

          {/* Giriş gerektiren sayfalar */}
          <Route element={<ProtectedRoute />}>
            <Route path="/builds" element={<Builds />} />
            <Route path="/builds/:id" element={<BuildDetail />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </>
  )
}
