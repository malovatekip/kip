import axios from 'axios'

//const api = axios.create({ baseURL: '/api' }) ==
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api'
//  baseURL: "https://kian-inscrutable-contessa.ngrok-free.dev/api"
})

// Attach token to every request automatically ==
api.interceptors.request.use(config => {
  const token = localStorage.getItem('kip_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401 (token expired) globally==
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('kip_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
