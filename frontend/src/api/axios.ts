// src/api/axios.ts
import axios from 'axios'
import { getAccessToken, setAccessToken, clearAccessToken } from './auth'

// baseURL = your backend origin
const api = axios.create({
  baseURL: 'http://localhost:4000/api',
  withCredentials: true, // IMPORTANT: include cookies on cross-origin requests
  headers: { Accept: 'application/json' }
})

/**
 * Request interceptor — attach access token from memory
 */
api.interceptors.request.use((config) => {
  const t = getAccessToken()
  if (t && config.headers) config.headers.Authorization = `Bearer ${t}`
  return config
})

/**
 * Response interceptor — handle 401 by attempting refresh.
 * This implementation serializes refresh calls so multiple 401s trigger
 * only one refresh request.
 */
let isRefreshing = false
let waitingQueue: Array<(token?: string | null) => void> = []

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    // if no response or not 401, just reject
    if (!error.response || error.response.status !== 401) {
      return Promise.reject(error)
    }

    // if retry already attempted for this request, redirect to login
    if (original._retry) {
      // clear token and navigate to login (frontend should handle UI redirect)
      clearAccessToken()
      window.location.href = '/login'
      return Promise.reject(error)
    }

    original._retry = true

    if (isRefreshing) {
      // queue this request until the refresh completes
      return new Promise((resolve, reject) => {
        waitingQueue.push((token) => {
          if (token) {
            original.headers['Authorization'] = `Bearer ${token}`
            resolve(api(original))
          } else {
            reject(error)
          }
        })
      })
    }

    isRefreshing = true

    try {
      // call refresh endpoint (cookie will be sent because withCredentials true)
      const r = await axios.post('http://localhost:4000/auth/refresh', {}, { withCredentials: true })
      const newAccess = r.data.accessToken
      setAccessToken(newAccess)

      // retry original request with new token
      original.headers['Authorization'] = `Bearer ${newAccess}`

      // notify queued calls
      waitingQueue.forEach((cb) => cb(newAccess))
      waitingQueue = []
      isRefreshing = false

      return api(original)
    } catch (e) {
      // refresh failed -> clear token, notify queue, redirect to login
      isRefreshing = false
      waitingQueue.forEach((cb) => cb(null))
      waitingQueue = []
      clearAccessToken()
      window.location.href = '/login'
      return Promise.reject(e)
    }
  }
)

export default api
