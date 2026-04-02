import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'
import { Landmark, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { Link } from 'react-router-dom'

import { usePageTitle } from '../hooks/usePageTitle'

const loginSchema = z.object({
  mobile: z.string().length(10, 'Mobile number must be 10 digits').regex(/^\d+$/, 'Must contain only numbers'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function Login() {
  usePageTitle('Login')
  const { login, isLoading, error, clearError } = useAuthStore()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    clearError()
    await login(data.mobile, data.password)
    const currentError = useAuthStore.getState().error
    if (!currentError) {
      const role = useAuthStore.getState().user?.role
      if (role === 'beneficiary') navigate('/loan/upload')
      else if (role === 'state_officer') navigate('/loan/review')
      else if (role === 'bank_officer') navigate('/credit/scores')
      else navigate('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f6f2] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 bg-[#01696f] rounded-full flex items-center justify-center">
                <Landmark className="h-8 w-8 text-[#d19900]" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-[#01696f]">SAMAAN</h1>
            <p className="text-gray-600 mt-2">Empowering the Marginalized through Transparent Governance</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
              <input
                {...register('mobile')}
                type="text"
                maxLength={10}
                placeholder="10-digit mobile number"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#01696f] focus:border-transparent outline-none transition-all"
              />
              {errors.mobile && (
                <p className="text-red-500 text-sm mt-1">{errors.mobile.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#01696f] focus:border-transparent outline-none transition-all pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#01696f] text-white py-3 rounded-lg font-semibold hover:bg-[#015459] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-200 space-y-3">
            <p className="text-sm text-gray-600 text-center">
              Sign in with your registered mobile number and password.
            </p>
            <p className="text-sm text-center">
              First time here? <Link to="/register" className="font-semibold text-[#01696f]">Create an account</Link>
            </p>
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Ministry of Social Justice & Empowerment, Government of India
        </p>
      </div>
    </div>
  )
}
