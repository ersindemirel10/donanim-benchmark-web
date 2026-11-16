/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react'
import { api, clearTokens, getAccess, saveTokens } from '../api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // user: giriş yapan kullanıcı (id, username, email) ya da null
  const [user, setUser] = useState(null)
  // loading: sayfa ilk açılırken token'ın geçerli olup olmadığı kontrol ediliyor
  const [loading, setLoading] = useState(Boolean(getAccess()))

  // Sayfa yenilenince token varsa kullanıcıyı geri yükle
  useEffect(() => {
    if (!getAccess()) return
    api
      .get('/auth/me/')
      .then(setUser)
      .catch(() => clearTokens())
      .finally(() => setLoading(false))
  }, [])

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
    setUser(me)
  }

  function logout() {
    clearTokens()
    setUser(null)
  }

  function register(data) {
    return api.post('/auth/register/', data)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
