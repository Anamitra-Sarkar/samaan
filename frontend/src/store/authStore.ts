import { create } from 'zustand'
import { persist } from 'zustand/middleware'
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
  persist(
    (set, get) => ({
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
          
          // Get user info
          const userResponse = await axios.get(`${import.meta.env.VITE_API_BASE_URL || '/api'}/auth/me`, {
            headers: { Authorization: `Bearer ${access_token}` }
          })
          
          set({ 
            token: access_token, 
            user: userResponse.data,
            isLoading: false 
          })
          
          localStorage.setItem('samaan_token', access_token)
          localStorage.setItem('samaan_user', JSON.stringify(userResponse.data))
        } catch (error: any) {
          set({ 
            error: error.response?.data?.detail || 'Login failed', 
            isLoading: false 
          })
        }
      },

      logout: () => {
        localStorage.removeItem('samaan_token')
        localStorage.removeItem('samaan_user')
        set({ token: null, user: null, error: null })
      },

      initializeAuth: () => {
        const token = localStorage.getItem('samaan_token')
        const userStr = localStorage.getItem('samaan_user')
        if (token && userStr) {
          try {
            const user = JSON.parse(userStr)
            set({ token, user })
          } catch {
            localStorage.removeItem('samaan_token')
            localStorage.removeItem('samaan_user')
          }
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'samaan-auth',
    }
  )
)
