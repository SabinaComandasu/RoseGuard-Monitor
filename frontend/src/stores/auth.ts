import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

interface AuthUser {
  email: string
  firstName: string
  lastName: string
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:5032/api'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'))
  const user  = ref<AuthUser | null>(JSON.parse(localStorage.getItem('user') || 'null'))

  const isAuthenticated = computed(() => !!token.value)

  function persist(t: string, u: AuthUser) {
    token.value = t
    user.value  = u
    localStorage.setItem('token', t)
    localStorage.setItem('user', JSON.stringify(u))
  }

  function clear() {
    token.value = null
    user.value  = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  async function login(email: string, password: string) {
    const res = await fetch(`${API}/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message ?? 'Login failed.')
    persist(data.token, { email: data.email, firstName: data.firstName, lastName: data.lastName })
  }

  async function register(email: string, password: string, firstName: string, lastName: string) {
    const res = await fetch(`${API}/auth/register`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password, firstName, lastName }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message ?? 'Registration failed.')
    persist(data.token, { email: data.email, firstName: data.firstName, lastName: data.lastName })
  }

  async function loginWithGoogle(idToken: string) {
    const res = await fetch(`${API}/auth/google`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ idToken }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message ?? 'Google sign-in failed.')
    persist(data.token, { email: data.email, firstName: data.firstName, lastName: data.lastName })
  }

  function logout() {
    clear()
  }

  return { token, user, isAuthenticated, login, register, loginWithGoogle, logout }
})
