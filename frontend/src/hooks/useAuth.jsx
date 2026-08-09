import { useState, useEffect, createContext, useContext } from 'react'
import api from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('kip_token')
    if (token) {
      api.get('/auth/me')
        .then(res => setUser(res.data))
        .catch(() => localStorage.removeItem('kip_token'))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = (token, userData) => {
    localStorage.setItem('kip_token', token)
    setUser(userData)
  }

  const logout = () => {
    // Capture the token before clearing storage — the axios interceptor
    // reads from localStorage on every request, so once we clear it the
    // interceptor can no longer attach it itself.
    const token = localStorage.getItem('kip_token')

    ;['kip_token', 'token', 'access_token', 'kip_user'].forEach(k => localStorage.removeItem(k))
    setUser(null)

    if (token) {
      // Best-effort server-side revocation so the token can't be replayed
      // after logout, even if a copy of it leaked. Don't block the UI on
      // this — the user is signed out locally regardless of the outcome.
      api.post('/auth/logout', {}, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
