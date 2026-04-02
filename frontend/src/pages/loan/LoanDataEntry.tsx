import { useEffect, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { client } from '../../api/client'

import { usePageTitle } from '../../hooks/usePageTitle'

const states = ['Uttar Pradesh', 'Bihar', 'Rajasthan', 'Madhya Pradesh', 'Maharashtra', 'Other'] as const

const schema = z.object({
  beneficiary_name: z.string().min(2, 'Beneficiary name is required'),
  mobile: z.string().regex(/^\d{10}$/, 'Mobile number must be 10 digits'),
  state: z.enum(states),
  district: z.string().min(2, 'District is required'),
  loan_amount: z.coerce.number().min(1000, 'Loan amount must be at least 1000'),
  loan_purpose: z.string().min(2, 'Loan purpose is required'),
  asset_description: z.string().optional(),
  loan_date: z.string().min(1, 'Loan date is required'),
})

type Values = z.infer<typeof schema>

export default function LoanDataEntry() {
  usePageTitle('Loan Data Entry')
  const [toast, setToast] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      state: 'Uttar Pradesh',
      loan_date: new Date().toISOString().slice(0, 10),
    },
  })

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3000)
    return () => window.clearTimeout(timer)
  }, [toast])

  const onSubmit = async (values: Values) => {
    setServerError(null)
    const payload = {
      ...values,
      loan_date: new Date(values.loan_date).toISOString(),
    }
    try {
      await client.post('/loan/enter-beneficiary', payload)
      setToast('Beneficiary record saved successfully.')
      reset({
        beneficiary_name: '',
        mobile: '',
        state: 'Uttar Pradesh',
        district: '',
        loan_amount: 1000,
        loan_purpose: '',
        asset_description: '',
        loan_date: new Date().toISOString().slice(0, 10),
      })
    } catch (error: any) {
      setServerError(error.response?.data?.detail || 'Unable to save beneficiary record')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Loan data entry</h1>
        <p className="text-sm text-gray-500">Register beneficiary loan details for utilization tracking.</p>
      </div>

      {toast && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          {toast}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 rounded-xl bg-white p-6 shadow-sm lg:grid-cols-2">
        <Field label="Beneficiary name" error={errors.beneficiary_name?.message as string | undefined}>
          <input {...register('beneficiary_name')} className={inputClass} placeholder="Full name" />
        </Field>
        <Field label="Mobile number" error={errors.mobile?.message as string | undefined}>
          <input {...register('mobile')} className={inputClass} maxLength={10} placeholder="10-digit mobile number" />
        </Field>
        <Field label="State" error={errors.state?.message as string | undefined}>
          <select {...register('state')} className={inputClass}>
            {states.map((state) => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
        </Field>
        <Field label="District" error={errors.district?.message as string | undefined}>
          <input {...register('district')} className={inputClass} placeholder="District" />
        </Field>
        <Field label="Loan amount" error={errors.loan_amount?.message as string | undefined}>
          <input {...register('loan_amount')} type="number" min={1000} className={inputClass} placeholder="1000" />
        </Field>
        <Field label="Loan date" error={errors.loan_date?.message as string | undefined}>
          <input {...register('loan_date')} type="date" className={inputClass} />
        </Field>
        <div className="lg:col-span-2">
          <Field label="Loan purpose" error={errors.loan_purpose?.message as string | undefined}>
            <input {...register('loan_purpose')} className={inputClass} placeholder="Purpose of the loan" />
          </Field>
        </div>
        <div className="lg:col-span-2">
          <Field label="Asset description" error={errors.asset_description?.message as string | undefined}>
            <textarea {...register('asset_description')} rows={4} className={inputClass} placeholder="Optional asset description" />
          </Field>
        </div>

        <div className="lg:col-span-2 space-y-3">
          {serverError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {serverError}
            </div>
          )}
          <button disabled={isSubmitting} className="rounded-md bg-[#01696f] px-4 py-2 font-semibold text-white disabled:opacity-50">
            {isSubmitting ? 'Saving...' : 'Save beneficiary record'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      {children}
      {error && <span className="text-sm text-red-600">{error}</span>}
    </label>
  )
}

const inputClass = 'w-full rounded-md border border-gray-300 px-3 py-2'
