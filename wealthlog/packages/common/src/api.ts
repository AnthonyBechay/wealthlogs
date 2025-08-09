import axios from 'axios'
import { Capacitor } from '@capacitor/core'

// We'll store the token in a local variable for immediate access
let accessToken: string | null = null

// Helper to set or clear the access token in memory and localStorage
export function setAccessToken(token: string | null) {
  accessToken = token
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('accessToken', token)
    } else {
      localStorage.removeItem('accessToken')
    }
  }
}

// On script load, try to initialize the token from localStorage
if (typeof window !== 'undefined') {
  const storedToken = localStorage.getItem('accessToken')
  if (storedToken) {
    accessToken = storedToken
  }
}

const getApiBaseUrl = () => {
  // Prioritize the environment variable if it's set
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL
  }

  // Check if running in a native mobile environment
  if (Capacitor.isNativePlatform()) {
    // For native mobile, use the specific IP for the host machine
    // Android emulator typically uses 10.0.2.2
    return 'http://10.0.2.2:5000'
  }

  // Default to localhost for development if no env var is set
  return 'http://localhost:5000'
}

// Create an Axios instance with the dynamic base URL
export const api = axios.create({
  baseURL: getApiBaseUrl(),
})

// Request interceptor to add the Bearer token to every outgoing request
api.interceptors.request.use(
  (config) => {
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)
