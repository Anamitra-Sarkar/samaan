import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { client } from '../../api/client'

import { usePageTitle } from '../../hooks/usePageTitle'

const schema = z.object({
  name: z.string().min(2),
  aadhaar_last4: z.string().length(4),
  mobile: z.string().length(10),
  state: z.string().min(2),
  district: z.string().min(2),
  case_type: z.enum(['pcr', 'poa']),
  fir_number: z.string().min(2),
  court_case_number: z.string().optional(),
  incident_date: z.string().min(8),
})

type Values = z.infer<typeof schema>

export default function SocialPension() {
  usePageTitle('Victim Registration')
  const [createdId, setCreatedId] = useState<number | null>(null)
  const [verificationResult, setVerificationResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { state: '', district: '', case_type: 'poa', incident_date: new Date().toISOString().slice(0, 16) },
  })

  const onSubmit = async (values: Values) => {
    setError(null)
    const response = await client.post('/dbt/register-victim', values)
    setCreatedId(response.data.id)
    setVerificationResult(null)
  }

  const verify = async () => {
    if (!createdId) return
    setError(null)
    try {
      const response = await client.post(`/dbt/verify/${createdId}`)
      setVerificationResult(
        [
          response.data.aadhaar_verified ? 'Aadhaar verified' : 'Aadhaar pending',
          response.data.digilocker_verified ? 'DigiLocker verified' : 'DigiLocker pending',
          response.data.cctns_verified ? 'CCTNS verified' : 'CCTNS pending',
        ].join(' · ')
      )
      setCreatedId(null)
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Verification could not be completed')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Victim registration</h1>
        <p className="text-sm text-gray-500">Register PCR/PoA beneficiaries before creating a DBT case.</p>
      </div>
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 rounded-xl bg-white p-6 shadow-sm md:grid-cols-2">
        {['name', 'aadhaar_last4', 'mobile', 'state', 'district', 'fir_number', 'court_case_number', 'incident_date'].map((field) => (
          <div key={field}>
            <label className="mb-1 block text-sm font-medium capitalize">{field.replace('_', ' ')}</label>
            <input {...register(field as keyof Values)} className="w-full rounded-md border border-gray-300 px-3 py-2" type={field === 'incident_date' ? 'datetime-local' : 'text'} />
          </div>
        ))}
        <div>
          <label className="mb-1 block text-sm font-medium">Case type</label>
          <select {...register('case_type')} className="w-full rounded-md border border-gray-300 px-3 py-2">
            <option value="pcr">PCR</option>
            <option value="poa">POA</option>
          </select>
        </div>
        <div className="md:col-span-2 flex gap-3">
          <button disabled={isSubmitting} className="rounded-md bg-[#01696f] px-4 py-2 font-semibold text-white disabled:opacity-50">Register victim</button>
          <button type="button" disabled={!createdId} onClick={verify} className="rounded-md border border-[#01696f] px-4 py-2 font-semibold text-[#01696f] disabled:opacity-50">Run verification</button>
        </div>
        {verificationResult && <div className="md:col-span-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{verificationResult}</div>}
      </form>
    </div>
  )
}
