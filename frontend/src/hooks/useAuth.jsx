import React, { createContext, useContext, useState, useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import api from '../lib/api'

const AuthContext = createContext(null)

const TOKEN_KEYS = ['kip_token', 'token', 'access_token']

function readToken() {
  for (const key of TOKEN_KEYS) {
    const t = localStorage.getItem(key)
    if (t) return t
  }
  return null
}

function readUser() {
  try {
    const u = localStorage.getItem('kip_user')
    return u ? JSON.parse(u) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  // Initialise synchronously from localStorage — prevents flash-to-login on reload
  const [token, setToken] = useState(() => readToken())
  const [user,  setUser]  = useState(() => readUser())
  const [ready, setReady] = useState(false)

  // On mount: validate stored token with the server
  useEffect(() => {
    const stored = readToken()
    if (!stored) {
      setReady(true)
      return
    }

    // Set token on axios so the /me call is authenticated
    api.defaults.headers.common['Authorization'] = `Bearer ${stored}`

    api.get('/auth/me')
      .then(r => {
        setToken(stored)
        setUser(r.data)
        localStorage.setItem('kip_user', JSON.stringify(r.data))
      })
      .catch(() => {
        // Token invalid or expired — clear everything
        TOKEN_KEYS.forEach(k => localStorage.removeItem(k))
        localStorage.removeItem('kip_user')
        setToken(null)
        setUser(null)
        delete api.defaults.headers.common['Authorization']
      })
      .finally(() => setReady(true))
  }, [])

  // Keep axios header in sync with token state
  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    } else {
      delete api.defaults.headers.common['Authorization']
    }
  }, [token])

  const login = (newToken, newUser) => {
    // Store token under all keys for compatibility with Protected component
    localStorage.setItem('kip_token',    newToken)
    localStorage.setItem('token',        newToken)
    localStorage.setItem('access_token', newToken)
    localStorage.setItem('kip_user',     JSON.stringify(newUser))
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
    setToken(newToken)
    setUser(newUser)
  }

  const logout = () => {
    TOKEN_KEYS.forEach(k => localStorage.removeItem(k))
    localStorage.removeItem('kip_user')
    delete api.defaults.headers.common['Authorization']
    setToken(null)
    setUser(null)
  }

  // Don't render children until we've validated the token —
  // prevents Protected from redirecting to /login before the check completes
  if (!ready) {
    return (
      <div style={{
        height: '100dvh', background: '#080B10',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          border: '3px solid rgba(43,127,255,0.2)',
          borderTopColor: '#2B7FFF',
          animation: 'spin 0.7s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <AuthContext.Provider value={{ token, user, login, logout }}>
        {children}
      </AuthContext.Provider>
    </BrowserRouter>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
