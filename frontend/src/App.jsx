import { NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import { useAuth } from './auth/AuthContext.jsx'
import ProtectedRoute from './auth/ProtectedRoute.jsx'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Builds from './pages/Builds.jsx'
import Components from './pages/Components.jsx'

function NotFound() {
  return (
    <div>
      <h2>Sayfa bulunamadı</h2>
      <p>Aradığınız adres yok.</p>
    </div>
  )
}

export default function App() {
  const { user, logout } = useAuth()
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
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/components" element={<Components />} />

          {/* Giriş gerektiren sayfalar */}
          <Route element={<ProtectedRoute />}>
            <Route path="/builds" element={<Builds />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </>
  )
}
