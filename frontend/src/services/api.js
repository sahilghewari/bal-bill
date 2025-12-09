import axios from 'axios'

const resolvedBaseUrl = import.meta.env.VITE_API_URL?.trim()
const API_BASE_URL = resolvedBaseUrl && resolvedBaseUrl.length > 0 ? resolvedBaseUrl : '/api'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    if (import.meta.env.DEV) {
      console.log('🔵 API Request:', {
        method: config.method?.toUpperCase(),
        url: config.url,
        data: config.data,
      })
    }

    return config
  },
  (error) => Promise.reject(error)
)

apiClient.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.log('🟢 API Response:', {
        url: response.config.url,
        status: response.status,
        data: response.data,
      })
    }
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken')
      window.location.href = '/login'
    }

    if (error.response?.status === 429) {
      console.error('Rate limited - please try again later')
    }

    if (import.meta.env.DEV) {
      console.error('🔴 API Error:', {
        url: error.config?.url,
        status: error.response?.status,
        message: error.response?.data?.error || error.message,
      })
    }

    return Promise.reject(error)
  }
)

export default apiClient
