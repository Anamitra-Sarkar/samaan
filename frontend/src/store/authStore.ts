import { create } from 'zustand'
import axios from 'axios'

interface User {
  id: number
  mobile: string
  name: string
  role: 'beneficiary' | 'state_officer' | 'bank_officer' | 'admin'
  state: string | null
  district: string | null
  is_active: boolean
}

type AuthResponse = {
  access_token: string
  refresh_token: string
  expires_in: number
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api'
const storageKeys = {
  token: 'samaan.token',
  refreshToken: 'samaan.refreshToken',
  user: 'samaan.user',
}

const authApi = axios.create({
  baseURL: apiBaseUrl,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

interface AuthState {
  token: string | null
  refreshToken: string | null
  user: User | null
  isLoading: boolean
  isHydrated: boolean
  error: string | null
  login: (mobile: string, password: string) => Promise<void>
  refreshSession: () => Promise<string>
  logout: () => void
  initializeAuth: () => void
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  (set) => ({
    token: null,
    refreshToken: null,
    user: null,
    isLoading: false,
    isHydrated: false,
    error: null,

    login: async (mobile: string, password: string) => {
      set({ isLoading: true, error: null })
      try {
        const response = await authApi.post<AuthResponse>('/auth/login', { mobile, password })
        const { access_token, refresh_token } = response.data

        const userResponse = await authApi.get('/auth/me', {
          headers: { Authorization: `Bearer ${access_token}` }
        })

        localStorage.setItem(storageKeys.token, access_token)
        localStorage.setItem(storageKeys.refreshToken, refresh_token)
        localStorage.setItem(storageKeys.user, JSON.stringify(userResponse.data))

        set({
          token: access_token,
          refreshToken: refresh_token,
          user: userResponse.data,
          isLoading: false,
          isHydrated: true,
        })
      } catch (error: any) {
        localStorage.removeItem(storageKeys.token)
        localStorage.removeItem(storageKeys.refreshToken)
        localStorage.removeItem(storageKeys.user)
        set({
          error: error.response?.data?.detail || 'Login failed',
          isLoading: false
        })
      }
    },

    refreshSession: async () => {
      const refreshToken = useAuthStore.getState().refreshToken || localStorage.getItem(storageKeys.refreshToken)
      if (!refreshToken) {
        useAuthStore.getState().logout()
        throw new Error('Missing refresh token')
      }

      const response = await authApi.post<AuthResponse>('/auth/refresh', { refresh_token: refreshToken })
      const { access_token } = response.data
      const userResponse = await authApi.get('/auth/me', {
        headers: { Authorization: `Bearer ${access_token}` }
      })

      localStorage.setItem(storageKeys.token, access_token)
      localStorage.setItem(storageKeys.refreshToken, response.data.refresh_token || refreshToken)
      localStorage.setItem(storageKeys.user, JSON.stringify(userResponse.data))

      set({
        token: access_token,
        refreshToken: response.data.refresh_token || refreshToken,
        user: userResponse.data,
        isLoading: false,
        isHydrated: true,
      })

      return access_token
    },

    logout: () => {
      localStorage.removeItem(storageKeys.token)
      localStorage.removeItem(storageKeys.refreshToken)
      localStorage.removeItem(storageKeys.user)
      set({ token: null, refreshToken: null, user: null, error: null, isLoading: false, isHydrated: true })
    },

    initializeAuth: () => {
      const token = localStorage.getItem(storageKeys.token)
      const refreshToken = localStorage.getItem(storageKeys.refreshToken)
      const userRaw = localStorage.getItem(storageKeys.user)
      let user: User | null = null
      if (userRaw) {
        try {
          user = JSON.parse(userRaw) as User
        } catch {
          localStorage.removeItem(storageKeys.user)
        }
      }
      set({
        token,
        refreshToken,
        user,
        isHydrated: true,
      })
    },

    clearError: () => set({ error: null }),
  })
)
