import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'

// Giriş yapılmamışsa /login'e yönlendirir, girişten sonra geri döner
export default function ProtectedRoute() {
  const { user, loading, offline, loggedOut } = useAuth()
  const location = useLocation()

  if (loading) return <p>Yükleniyor...</p>
  // Sunucuya ulaşılamıyorsa giriş yapılmamış sayma, oturum korunuyor
  if (!user && offline) return <p>Sunucuya bağlanınca bu sayfa açılacak.</p>
  // Kendi isteğiyle çıkış/hesap silme: dönüş adresi yok, varsa mesaj /login'de gösterilir
  if (!user && loggedOut) {
    const state = loggedOut.message ? { message: loggedOut.message } : null
    return <Navigate to="/login" state={state} replace />
  }
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  return <Outlet />
}
