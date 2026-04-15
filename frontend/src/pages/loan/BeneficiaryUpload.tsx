import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { client } from '../../api/client'
import FileUpload from '../../components/shared/FileUpload'
import { useAuthStore } from '../../store/authStore'

import { usePageTitle } from '../../hooks/usePageTitle'

const schema = z.object({
  loan_id: z.coerce.number().int().positive(),
})

type FormValues = z.infer<typeof schema>

type LoanRecord = {
  id: number
  loan_amount: number
  loan_purpose: string
  loan_status: string
  loan_date: string
}

export default function BeneficiaryUpload() {
  usePageTitle('Loan Proof Upload')
  const { user } = useAuthStore()
  const [file, setFile] = useState<File | null>(null)
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null)
  const [result, setResult] = useState<any>(null)
  const [proofs, setProofs] = useState<any[]>([])
  const [loans, setLoans] = useState<LoanRecord[]>([])
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const selectedLoanId = watch('loan_id')

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setPosition({ lat: 25.5941, lng: 85.1376 })
    )
    client.get('/loan/my-proofs').then((res) => setProofs(res.data)).catch(() => setProofs([]))
    client.get('/loan/my-records').then((res) => setLoans(res.data || [])).catch(() => setLoans([]))
  }, [])

  useEffect(() => {
    if (loans.length > 0 && !selectedLoanId) {
      setValue('loan_id', loans[0].id, { shouldValidate: true })
    }
  }, [loans, selectedLoanId, setValue])

  const onSubmit = async (values: FormValues) => {
    if (!file) return
    setLoading(true)
    setResult(null)
    const formData = new FormData()
    formData.append('loan_id', String(values.loan_id))
    if (position) {
      formData.append('geolat', String(position.lat))
      formData.append('geolng', String(position.lng))
    }
    formData.append('file', file)
    try {
      const response = await client.post('/loan/upload-proof', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      setResult(response.data)
      const refreshed = await client.get('/loan/my-proofs')
      setProofs(refreshed.data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Loan proof upload</h1>
        <p className="text-sm text-gray-500">Upload a geo-tagged photo or video for your loan utilization record.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 rounded-xl bg-white p-6 shadow-sm lg:grid-cols-2">
        <div className="space-y-4">
          <label className="block text-sm font-medium">Loan record</label>
          {loans.length > 0 ? (
            <select className="w-full rounded-md border border-gray-300 px-3 py-2" {...register('loan_id')}>
              {loans.map((loan) => (
                <option key={loan.id} value={loan.id}>
                  #{loan.id} · ₹{Number(loan.loan_amount).toLocaleString()} · {loan.loan_purpose}
                </option>
              ))}
            </select>
          ) : (
            <div className="rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
              No loan record found yet. Ask the state officer to create your beneficiary record first.
            </div>
          )}
          {errors.loan_id && <p className="text-sm text-red-600">{errors.loan_id.message}</p>}

          <div>
            <p className="mb-2 text-sm font-medium">Current location</p>
            <div className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700">
              {position ? `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}` : 'Fetching GPS...'}
            </div>
          </div>

          <FileUpload accept="image/*,video/*" onChange={setFile} />
          {file && <p className="text-sm text-gray-600">Selected: {file.name}</p>}
        </div>

        <div className="space-y-4">
          <button disabled={loading || loans.length === 0} className="rounded-md bg-[#01696f] px-4 py-2 font-semibold text-white disabled:opacity-50">
            {loading ? 'Uploading...' : 'Upload proof'}
          </button>
          {result && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
              <div>Status: {result.ai_validation_status}</div>
              <div>Confidence: {Number(result.ai_confidence_score ?? 0).toFixed(2)}</div>
              <div>{result.ai_remarks}</div>
            </div>
          )}
        </div>
      </form>

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">My submissions</h2>
        <div className="space-y-3">
          {proofs.map((proof) => (
            <div key={proof.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-sm">
              <div>
                <div className="font-medium">Loan #{proof.loan_id}</div>
                <div className="text-gray-500">{proof.original_filename}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{proof.ai_validation_status}</div>
                <div className="text-gray-500">{proof.ai_confidence_score?.toFixed?.(2) ?? proof.ai_confidence_score}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
