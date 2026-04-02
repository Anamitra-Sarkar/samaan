import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { client } from '../../api/client'

import { usePageTitle } from '../../hooks/usePageTitle'

const schema = z.object({
  mobile: z.string().regex(/^\d{10}$/, 'Enter a valid 10-digit mobile number'),
})

type FormValues = z.infer<typeof schema>

type CaseRow = {
  id: number
  victim_name: string
  mobile: string
  victim_state: string
  victim_district: string
  case_type: string
  status: string
  approved_amount: number
  disbursed_amount: number
  assigned_officer?: string | null
}

export default function DBTChecker() {
  usePageTitle('DBT Checker')
  const [cases, setCases] = useState<CaseRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (!searched) {
      setCases([])
    }
  }, [searched])

  const onSubmit = async (values: FormValues) => {
    setLoading(true)
    setError(null)
    setSearched(true)
    try {
      const res = await client.get('/dbt/cases', { params: { mobile: values.mobile } })
      setCases(res.data.items || [])
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Unable to look up DBT cases')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">DBT checker</h1>
        <p className="text-sm text-gray-500">Lookup DBT cases by mobile number with privacy-preserving access.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="rounded-xl bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Mobile number</label>
            <input {...register('mobile')} className="w-full rounded-md border border-gray-300 px-3 py-2" placeholder="10-digit mobile number" />
            {errors.mobile && <p className="mt-1 text-sm text-red-600">{errors.mobile.message}</p>}
          </div>
          <div className="flex items-end">
            <button disabled={isSubmitting || loading} className="rounded-md bg-[#01696f] px-4 py-2 font-semibold text-white disabled:opacity-50">
              {loading ? 'Searching...' : 'Check status'}
            </button>
          </div>
        </div>
      </form>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="h-40 animate-pulse rounded-xl bg-gray-200" />
      ) : cases.length > 0 ? (
        <div className="space-y-4">
          {cases.map((item) => (
            <div key={item.id} className="rounded-xl bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{item.victim_name}</h2>
                  <p className="text-sm text-gray-500">{item.case_type.toUpperCase()} · {item.victim_district}, {item.victim_state}</p>
                </div>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">{item.status.replace('_', ' ')}</span>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-4">
                <Meta label="Approved amount" value={`₹${Number(item.approved_amount).toLocaleString()}`} />
                <Meta label="Disbursed amount" value={`₹${Number(item.disbursed_amount).toLocaleString()}`} />
                <Meta label="Assigned officer" value={item.assigned_officer || 'Unassigned'} />
                <Meta label="Mobile" value={item.mobile} />
              </div>

              <div className="mt-4 flex items-center gap-3">
                <Link to="/dbt/grievance" className="rounded-md border border-[#01696f] px-4 py-2 text-sm font-semibold text-[#01696f] hover:bg-[#01696f]/5">
                  Submit grievance
                </Link>
                <Link to={`/dbt/case/${item.id}`} className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white">
                  View case timeline
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : searched ? (
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">No cases found for this mobile number.</div>
      ) : null}
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 font-semibold text-gray-900">{value}</p>
    </div>
  )
}
