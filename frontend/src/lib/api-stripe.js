import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
})

// Attach token to every request from localStorage
api.interceptors.request.use(config => {
  const token =
    localStorage.getItem('kip_token') ||
    localStorage.getItem('token')     ||
    localStorage.getItem('access_token')

  if (token && token !== 'undefined' && token !== 'null') {
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
})

// On 401 — clear token and go to login (only from protected pages)
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      const path = window.location.pathname
      const publicPaths = ['/', '/login', '/register', '/pricing',
                           '/about', '/contact', '/legal']
      const isPublic = publicPaths.some(p => path === p || path.startsWith(p + '/'))

      if (!isPublic) {
        ;['kip_token','token','access_token','kip_user'].forEach(k =>
          localStorage.removeItem(k))
        window.location.replace('/login')
      }
    }
    return Promise.reject(err)
  }
)

export default api
