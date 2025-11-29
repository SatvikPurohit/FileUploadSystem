// src/hooks/useAuth.ts
import api from '../api/axios'
import { setAccessToken, clearAccessToken } from '../api/auth'

export async function login(username: string, password: string) {
  // axios will send credentials? here server sets cookie in response
  const res = await api.post('/auth/login', { username, password })
  const access = res.data.accessToken
  setAccessToken(access)
  return res.data
}

export async function logout() {
  try {
    await api.post('/auth/logout') // server will clear cookie
  } catch (e) {
    // ignore error but still clear client
  } finally {
    clearAccessToken()
    // redirect to login
    window.location.href = '/login'
  }
}
