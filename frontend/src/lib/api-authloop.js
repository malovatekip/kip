import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
})

// Read token fresh from localStorage on every request
api.interceptors.request.use(config => {
  const token =
    localStorage.getItem('kip_token') ||
    localStorage.getItem('token')     ||
    localStorage.getItem('access_token')
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
})

// Handle 401 — clear token and redirect to login
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      const path = window.location.pathname
      const pub  = ['/', '/login', '/register', '/legal', '/about', '/contact', '/pricing']
      const onPublic = pub.some(p => path === p || path.startsWith(p + '/'))
      if (!onPublic) {
        ;['kip_token', 'token', 'access_token', 'kip_user'].forEach(k =>
          localStorage.removeItem(k)
        )
        window.location.replace('/login')
      }
    }
    return Promise.reject(error)
  }
)

export default api
