import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, Link } from 'react-router-dom'
import { Landmark, AlertCircle } from 'lucide-react'
import { client } from '../api/client'
import { useAuthStore } from '../store/authStore'

const registerSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  mobile: z.string().length(10, 'Mobile number must be 10 digits').regex(/^\d+$/, 'Must contain only numbers'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['beneficiary', 'state_officer', 'bank_officer', 'admin']).default('beneficiary'),
  state: z.string().optional(),
  district: z.string().optional(),
})

type RegisterForm = z.infer<typeof registerSchema>

export default function Register() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [serverMessage, setServerMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'beneficiary' },
  })

  const onSubmit = async (values: RegisterForm) => {
    setIsSubmitting(true)
    setServerMessage(null)
    try {
      await client.post('/auth/register', {
        name: values.name,
        mobile: values.mobile,
        password: values.password,
        role: values.role,
        state: values.state || null,
        district: values.district || null,
      })
      await login(values.mobile, values.password)
      navigate('/dashboard', { replace: true })
    } catch (error: any) {
      setServerMessage(error.response?.data?.detail || 'Registration failed')
    } finally {
      setIsSubmitting(false)
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
            <h1 className="text-3xl font-bold text-[#01696f]">Create SAMAAN account</h1>
            <p className="text-gray-600 mt-2">Register once and access the same data from any device.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {serverMessage && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm">{serverMessage}</span>
              </div>
            )}

            <input {...register('name')} className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="Full name" />
            {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}

            <input {...register('mobile')} className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="10-digit mobile number" />
            {errors.mobile && <p className="text-sm text-red-600">{errors.mobile.message}</p>}

            <input {...register('password')} type="password" className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="Create password" />
            {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}

            <select {...register('role')} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
              <option value="beneficiary">Beneficiary</option>
              <option value="state_officer">State Officer</option>
              <option value="bank_officer">Bank Officer</option>
              <option value="admin">Admin</option>
            </select>

            <div className="grid grid-cols-2 gap-3">
              <input {...register('state')} className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="State" />
              <input {...register('district')} className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="District" />
            </div>

            <button disabled={isSubmitting} className="w-full bg-[#01696f] text-white py-3 rounded-lg font-semibold disabled:opacity-50">
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="text-sm text-center mt-6">
            Already have an account? <Link to="/login" className="text-[#01696f] font-semibold">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
