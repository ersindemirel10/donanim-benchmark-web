import { NavLink, Route, Routes } from 'react-router-dom'
import Home from './pages/Home.jsx'

function NotFound() {
  return (
    <div>
      <h2>Sayfa bulunamadı</h2>
      <p>Aradığınız adres yok.</p>
    </div>
  )
}

export default function App() {
  return (
    <>
      <nav className="navbar">
        <span className="brand">Donanım Benchmark</span>
        <NavLink to="/" end>Ana Sayfa</NavLink>
        <NavLink to="/components">Parçalar</NavLink>
        <NavLink to="/builds">Sistemlerim</NavLink>
        <span className="spacer" />
        <NavLink to="/login">Giriş</NavLink>
        <NavLink to="/register">Kayıt</NavLink>
      </nav>

      <main className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </>
  )
}
