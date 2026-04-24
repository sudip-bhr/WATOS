import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
  timeout: 10000,
})

client.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      const refreshToken = useAuthStore.getState().refreshToken
      if (refreshToken) {
        try {
          const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
          const response = await axios.post(`${baseUrl}/auth/refresh`, { refresh_token: refreshToken })
          const { access_token } = response.data
          useAuthStore.getState().setToken(access_token)
          originalRequest.headers.Authorization = `Bearer ${access_token}`
          return client(originalRequest)
        } catch (refreshError) {
          useAuthStore.getState().logout()
          window.location.href = '/login'
        }
      } else {
        useAuthStore.getState().logout()
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default client
