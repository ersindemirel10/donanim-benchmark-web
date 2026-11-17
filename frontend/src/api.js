// Backend ile konuşan tek yer. Tüm sayfalar istekleri buradan yapar.

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'

// ---- Token saklama (localStorage) ----
export function getAccess() {
  return localStorage.getItem('access')
}

export function getRefresh() {
  return localStorage.getItem('refresh')
}

export function saveTokens({ access, refresh }) {
  if (access) localStorage.setItem('access', access)
  if (refresh) localStorage.setItem('refresh', refresh)
}

export function clearTokens() {
  localStorage.removeItem('access')
  localStorage.removeItem('refresh')
}

// ---- Hata sınıfı ----
// status: HTTP kodu (ağ hatasında 0), message: ekrana basılacak okunur metin,
// data: sunucunun döndürdüğü ham cevap (alan hataları için)
export class ApiError extends Error {
  constructor(status, message, data = null) {
    super(message)
    this.status = status
    this.data = data
  }
}

// {"detail": "..."} veya {"alan": ["hata1", "hata2"]} gibi cevapları tek metne çevirir
function readableMessage(data, status) {
  if (!data) return `Beklenmeyen bir hata oluştu (${status}).`
  if (typeof data === 'string') return data
  if (data.detail) return data.detail
  const lines = Object.entries(data).map(([field, errors]) => {
    const text = Array.isArray(errors) ? errors.join(' ') : String(errors)
    return `${field}: ${text}`
  })
  return lines.join('\n')
}

// ---- Access token yenileme ----
// Aynı anda birden fazla istek 401 alırsa tek bir refresh isteği atılır.
let refreshPromise = null

function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_URL}/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: getRefresh() }),
    })
      .catch(() => {
        // Ağ hatası: oturum bitmedi, sadece sunucuya ulaşılamadı (status 0)
        throw new ApiError(0, 'Sunucuya ulaşılamıyor. Backend çalışıyor mu?')
      })
      .then(async (res) => {
        if (!res.ok) {
          const message =
            res.status === 401 ? 'Oturum süresi doldu.' : 'Sunucu hatası, oturum yenilenemedi.'
          throw new ApiError(res.status, message)
        }
        const data = await res.json()
        saveTokens({ access: data.access })
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

// ---- Ana istek fonksiyonu ----
const NO_REFRESH_PATHS = ['/auth/login/', '/auth/register/', '/auth/refresh/']

async function request(method, path, body, canRetry = true) {
  const headers = { 'Content-Type': 'application/json' }
  const access = getAccess()
  if (access) headers.Authorization = `Bearer ${access}`

  let res
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'Sunucuya ulaşılamıyor. Backend çalışıyor mu?')
  }

  // Access token süresi dolduysa bir kez yenileyip isteği tekrar dene.
  // Login/register/refresh isteklerinde bunu yapmayız (yanlış şifre de 401 döner).
  // /auth/me/ token ile çalışır, o yüzden yenilenebilir.
  if (res.status === 401 && canRetry && getRefresh() && !NO_REFRESH_PATHS.includes(path)) {
    try {
      await refreshAccessToken()
    } catch (err) {
      // Sadece refresh token geçersizse (401) oturumu kapat.
      // Ağ hatasında ya da sunucu hatasında token'lar korunur.
      if (err.status !== 401) throw err
      clearTokens()
      window.dispatchEvent(new Event('auth:logout'))
      throw new ApiError(401, 'Oturum süresi doldu, lütfen tekrar giriş yapın.')
    }
    return request(method, path, body, false)
  }

  if (res.status === 204) return null

  let data = null
  try {
    data = await res.json()
  } catch {
    // cevap JSON değilse data null kalır
  }

  if (!res.ok) {
    throw new ApiError(res.status, readableMessage(data, res.status), data)
  }
  return data
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  patch: (path, body) => request('PATCH', path, body),
  delete: (path, body) => request('DELETE', path, body),
}
