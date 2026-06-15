import React, { createContext, useContext, useState } from 'react'
import api from '../lib/api'

const AuthContext = createContext(null)

const KEYS = ['kip_token', 'token', 'access_token']

function getStoredToken() {
  for (const k of KEYS) {
    const t = localStorage.getItem(k)
    if (t && t !== 'undefined' && t !== 'null') return t
  }
  return null
}

function getStoredUser() {
  try {
    const u = localStorage.getItem('kip_user')
    if (u && u !== 'undefined' && u !== 'null') return JSON.parse(u)
  } catch {}
  return null
}

export function AuthProvider({ children }) {
  // Read from localStorage synchronously — no async validation on mount
  const [token, setToken] = useState(() => getStoredToken())
  const [user,  setUser]  = useState(() => getStoredUser())

  const login = (newToken, newUser) => {
    if (!newToken) return
    KEYS.forEach(k => localStorage.setItem(k, newToken))
    if (newUser) localStorage.setItem('kip_user', JSON.stringify(newUser))
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
    setToken(newToken)
    setUser(newUser || null)
  }

  const logout = () => {
    KEYS.forEach(k => localStorage.removeItem(k))
    localStorage.removeItem('kip_user')
    delete api.defaults.headers.common['Authorization']
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
