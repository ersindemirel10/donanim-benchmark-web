/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api, clearTokens, getAccess, saveTokens } from '../api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // user: giriş yapan kullanıcı (id, username, email) ya da null
  const [user, setUser] = useState(null)
  // loading: sayfa ilk açılırken token'ın geçerli olup olmadığı kontrol ediliyor
  const [loading, setLoading] = useState(Boolean(getAccess()))
  // offline: sunucuya ulaşılamadı, ama oturum bilgisi (token'lar) korunuyor
  const [offline, setOffline] = useState(false)
  // loggedOut: kullanıcı kendi isteğiyle çıkış yaptı (ya da hesabını sildi). ProtectedRoute bunu
  // görünce "giriş sonrası buraya dön" bilgisi eklemez; message varsa /login'de gösterilir.
  const [loggedOut, setLoggedOut] = useState(null)

  // Token ile kullanıcıyı sunucudan yükler
  const loadUser = useCallback(() => {
    return api
      .get('/auth/me/')
      .then((me) => {
        setUser(me)
        setOffline(false)
      })
      .catch((err) => {
        if (err.status === 401) clearTokens() // oturum gerçekten geçersiz
        else setOffline(true) // ağ/sunucu hatası: çıkış yaptırma
      })
      .finally(() => setLoading(false))
  }, [])

  // Sayfa yenilenince token varsa kullanıcıyı geri yükle
  useEffect(() => {
    if (getAccess()) loadUser()
  }, [loadUser])

  // "Tekrar dene" butonu için
  function retry() {
    setLoading(true)
    loadUser()
  }

  // api.js refresh de başarısız olursa bu olayı gönderir: oturumu kapat
  useEffect(() => {
    const onLogout = () => setUser(null)
    window.addEventListener('auth:logout', onLogout)
    return () => window.removeEventListener('auth:logout', onLogout)
  }, [])

  async function login(username, password) {
    const tokens = await api.post('/auth/login/', { username, password })
    saveTokens(tokens)
    const me = await api.get('/auth/me/')
    setLoggedOut(null)
    setUser(me)
  }

  function logout(message = '') {
    clearTokens()
    setLoggedOut({ message })
    setUser(null)
  }

  // Hesabım sayfasında bilgiler güncellenince navbar'ın da güncellenmesi için
  function updateUser(me) {
    setUser(me)
  }

  function register(data) {
    return api.post('/auth/register/', data)
  }

  return (
    <AuthContext.Provider value={{ user, loading, offline, loggedOut, retry, login, logout, register, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
