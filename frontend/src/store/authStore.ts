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

interface AuthState {
  token: string | null
  user: User | null
  isLoading: boolean
  error: string | null
  login: (mobile: string, password: string) => Promise<void>
  logout: () => void
  initializeAuth: () => void
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  (set) => ({
    token: null,
    user: null,
    isLoading: false,
    error: null,

    login: async (mobile: string, password: string) => {
      set({ isLoading: true, error: null })
      try {
        const response = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL || '/api'}/auth/login`,
          { mobile, password }
        )
        const { access_token } = response.data

        const userResponse = await axios.get(`${import.meta.env.VITE_API_BASE_URL || '/api'}/auth/me`, {
          headers: { Authorization: `Bearer ${access_token}` }
        })

        set({
          token: access_token,
          user: userResponse.data,
          isLoading: false
        })
      } catch (error: any) {
        set({
          error: error.response?.data?.detail || 'Login failed',
          isLoading: false
        })
      }
    },

    logout: () => {
      set({ token: null, user: null, error: null })
    },

    initializeAuth: () => {
      set({ token: null, user: null })
    },

    clearError: () => set({ error: null }),
  })
)
