import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertCircle, CheckCircle2, Clock3, Landmark, ShieldCheck, UserRound } from 'lucide-react'
import { client } from '../../api/client'
import { useAuthStore } from '../../store/authStore'

import { usePageTitle } from '../../hooks/usePageTitle'

const sanctionSchema = z.object({
  approved_amount: z.coerce.number().min(1, 'Approved amount is required'),
})

const disburseSchema = z.object({
  amount: z.coerce.number().min(1, 'Disbursement amount is required'),
  bank_account_last4: z.string().regex(/^\d{4}$/, 'Enter the last 4 digits of the bank account'),
  remarks: z.string().optional(),
})

type SanctionValues = z.infer<typeof sanctionSchema>
type DisburseValues = z.infer<typeof disburseSchema>

type CaseDetail = {
  id: number
  victim_id: number
  assistance_type: string
  approved_amount: number
  disbursed_amount: number
  status: string
  assigned_officer_id?: number | null
  created_at: string
  updated_at?: string | null
}

type Victim = {
  id: number
  name: string
  mobile: string
  state: string
  district: string
  case_type: string
  fir_number: string
  verification_status: string
  digilocker_verified: boolean
  cctns_verified: boolean
}

type Disbursement = {
  id: number
  amount: number
  disbursed_at: string
  transaction_ref: string
  bank_account_last4?: string | null
  remarks?: string | null
}

type TimelineItem = {
  step: string
  timestamp: string
  status: string
  notes?: string | null
  performed_by?: string | null
}

type DetailResponse = {
  case: CaseDetail
  victim: Victim | null
  disbursements: Disbursement[]
  grievances: unknown[]
}

const statusStyles: Record<string, string> = {
  registered: 'bg-gray-100 text-gray-700',
  under_review: 'bg-orange-100 text-orange-700',
  sanctioned: 'bg-blue-100 text-blue-700',
  disbursed: 'bg-green-100 text-green-700',
  closed: 'bg-purple-100 text-purple-700',
}

export default function DBTCaseDetail() {
  const { id } = useParams()
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [detail, setDetail] = useState<DetailResponse | null>(null)
  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [showSanction, setShowSanction] = useState(false)
  const [showDisburse, setShowDisburse] = useState(false)

  const sanctionForm = useForm<SanctionValues>({
    resolver: zodResolver(sanctionSchema),
    defaultValues: { approved_amount: 0 },
  })
  const disburseForm = useForm<DisburseValues>({
    resolver: zodResolver(disburseSchema),
    defaultValues: { amount: 0, bank_account_last4: '' },
  })

  usePageTitle(detail ? `DBT Case #${detail.case.id}` : 'DBT Case Detail')

  const load = async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [detailRes, timelineRes] = await Promise.all([
        client.get(`/dbt/case/${id}`),
        client.get(`/dbt/case/${id}/timeline`),
      ])
      setDetail(detailRes.data)
      setTimeline(timelineRes.data.timeline || [])
      sanctionForm.reset({ approved_amount: Number(detailRes.data.case.approved_amount || 0) })
      disburseForm.reset({
        amount: Number(detailRes.data.case.approved_amount || 0) - Number(detailRes.data.case.disbursed_amount || 0),
        bank_account_last4: '',
        remarks: '',
      })
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to load case detail')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [id])

  useEffect(() => {
    if (!success) return
    const timer = window.setTimeout(() => setSuccess(null), 3500)
    return () => window.clearTimeout(timer)
  }, [success])

  const canAct = user?.role === 'state_officer' || user?.role === 'admin'

  const remainingAmount = useMemo(() => {
    if (!detail) return 0
    return Math.max(0, Number(detail.case.approved_amount || 0) - Number(detail.case.disbursed_amount || 0))
  }, [detail])

  if (loading) {
    return <div className="h-64 animate-pulse rounded-xl bg-gray-200" />
  }

  if (error) {
    return <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
  }

  if (!detail) {
    return <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">Case not found.</div>
  }

  const { case: caseData, victim, disbursements } = detail

  const handleSanction = async (values: SanctionValues) => {
    setError(null)
    setSuccess(null)
    try {
      await client.patch(`/dbt/case/${caseData.id}/sanction`, values)
      setSuccess('Case sanctioned successfully.')
      setShowSanction(false)
      await load()
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to sanction case')
    }
  }

  const handleDisburse = async (values: DisburseValues) => {
    setError(null)
    setSuccess(null)
    try {
      const res = await client.post(`/dbt/case/${caseData.id}/disburse`, values)
      setSuccess(`Funds disbursed successfully. Reference: ${res.data.transaction_ref}`)
      setShowDisburse(false)
      await load()
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to disburse funds')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl bg-white p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Case #{caseData.id}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusBadge status={caseData.status} />
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
              {caseData.assistance_type.replace('_', ' ')}
            </span>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
              Created {new Date(caseData.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Remaining amount</p>
          <p className="text-2xl font-bold text-gray-900">₹{remainingAmount.toLocaleString()}</p>
        </div>
      </div>

      {success && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <UserRound className="h-5 w-5 text-[#01696f]" />
            <h2 className="text-lg font-semibold text-gray-900">Victim info</h2>
          </div>
          {victim ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Info label="Name" value={victim.name} />
              <Info label="Mobile" value={`******${victim.mobile.slice(-4)}`} />
              <Info label="Case type" value={victim.case_type.toUpperCase()} />
              <Info label="FIR number" value={victim.fir_number} />
              <div className="sm:col-span-2 flex flex-wrap gap-2">
                <Badge label="Aadhaar" active={victim.verification_status === 'verified'} tone="green" />
                <Badge label="DigiLocker" active={victim.digilocker_verified} tone="blue" />
                <Badge label="CCTNS" active={victim.cctns_verified} tone="orange" />
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-500">Victim information unavailable.</p>
          )}
        </section>

        <section className="rounded-xl bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-[#01696f]" />
            <h2 className="text-lg font-semibold text-gray-900">Financial summary</h2>
          </div>
          <div className="mt-4 space-y-3">
            <SummaryRow label="Approved amount" value={`₹${Number(caseData.approved_amount).toLocaleString()}`} />
            <SummaryRow label="Disbursed amount" value={`₹${Number(caseData.disbursed_amount).toLocaleString()}`} />
            <SummaryRow label="Remaining amount" value={`₹${remainingAmount.toLocaleString()}`} />
            <div>
              <div className="mb-1 flex items-center justify-between text-sm text-gray-600">
                <span>Disbursement progress</span>
                <span>{caseData.approved_amount ? Math.round((caseData.disbursed_amount / caseData.approved_amount) * 100) : 0}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-[#01696f]"
                  style={{ width: `${caseData.approved_amount ? Math.min(100, (caseData.disbursed_amount / caseData.approved_amount) * 100) : 0}%` }}
                />
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-[#01696f]" />
          <h2 className="text-lg font-semibold text-gray-900">Timeline</h2>
        </div>
        <div className="mt-6 space-y-6">
          {['registered', 'verified', 'sanctioned', 'disbursed'].map((step, index) => {
            const matched = timeline.find((entry) => entry.step === step)
            const completed = Boolean(matched || (step === 'verified' && victim?.verification_status === 'verified') || (step === 'sanctioned' && ['sanctioned', 'disbursed', 'closed'].includes(caseData.status)) || (step === 'disbursed' && caseData.status === 'disbursed'))
            const Icon = completed ? CheckCircle2 : step === 'registered' ? Clock3 : AlertCircle
            return (
              <div key={step} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${completed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  {index < 3 && <div className="mt-2 h-full w-px bg-gray-200" />}
                </div>
                <div className="flex-1 pb-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 capitalize">{step}</h3>
                      <p className="text-sm text-gray-500">
                        {matched?.timestamp ? new Date(matched.timestamp).toLocaleString() : completed ? 'Completed' : 'Pending'}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${completed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {completed ? 'Done' : 'Pending'}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">{matched?.notes || (step === 'registered' ? 'Case created in the system' : step === 'verified' ? 'Victim verification pending' : step === 'sanctioned' ? 'Sanction pending' : 'Disbursement pending')}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {canAct && (
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Clock3 className="h-5 w-5 text-[#01696f]" />
            <h2 className="text-lg font-semibold text-gray-900">Action panel</h2>
          </div>
          {caseData.status === 'under_review' && (
            <div className="mt-4 space-y-4">
              <button
                type="button"
                onClick={() => setShowSanction((value) => !value)}
                className="rounded-md bg-[#01696f] px-4 py-2 text-sm font-semibold text-white"
              >
                Sanction Case
              </button>
              {showSanction && (
                <form onSubmit={sanctionForm.handleSubmit(handleSanction)} className="grid gap-3 md:grid-cols-[1fr_auto]">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Approved amount</label>
                    <input {...sanctionForm.register('approved_amount')} type="number" className="w-full rounded-md border border-gray-300 px-3 py-2" />
                    {sanctionForm.formState.errors.approved_amount && <p className="mt-1 text-sm text-red-600">{sanctionForm.formState.errors.approved_amount.message}</p>}
                  </div>
                  <div className="flex items-end">
                    <button disabled={sanctionForm.formState.isSubmitting} className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                      {sanctionForm.formState.isSubmitting ? 'Saving...' : 'Submit sanction'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {caseData.status === 'sanctioned' && (
            <div className="mt-4 space-y-4">
              <button
                type="button"
                onClick={() => setShowDisburse((value) => !value)}
                className="rounded-md bg-[#01696f] px-4 py-2 text-sm font-semibold text-white"
              >
                Disburse Funds
              </button>
              {showDisburse && (
                <form onSubmit={disburseForm.handleSubmit(handleDisburse)} className="grid gap-3 md:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Amount</label>
                    <input {...disburseForm.register('amount')} type="number" className="w-full rounded-md border border-gray-300 px-3 py-2" />
                    {disburseForm.formState.errors.amount && <p className="mt-1 text-sm text-red-600">{disburseForm.formState.errors.amount.message}</p>}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Bank account last 4</label>
                    <input {...disburseForm.register('bank_account_last4')} maxLength={4} className="w-full rounded-md border border-gray-300 px-3 py-2" />
                    {disburseForm.formState.errors.bank_account_last4 && <p className="mt-1 text-sm text-red-600">{disburseForm.formState.errors.bank_account_last4.message}</p>}
                  </div>
                  <div className="flex items-end">
                    <button disabled={disburseForm.formState.isSubmitting} className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                      {disburseForm.formState.isSubmitting ? 'Processing...' : 'Submit disbursement'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {caseData.status !== 'under_review' && caseData.status !== 'sanctioned' && (
            <p className="mt-3 text-sm text-gray-500">No actions available for this case status.</p>
          )}
        </section>
      )}

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Landmark className="h-5 w-5 text-[#01696f]" />
          <h2 className="text-lg font-semibold text-gray-900">Disbursements</h2>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <Th>Amount</Th>
                <Th>Date</Th>
                <Th>Transaction ref</Th>
                <Th>Bank last 4</Th>
                <Th>Remarks</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {disbursements.length > 0 ? disbursements.map((item) => (
                <tr key={item.id}>
                  <Td>₹{Number(item.amount).toLocaleString()}</Td>
                  <Td>{new Date(item.disbursed_at).toLocaleString()}</Td>
                  <Td>{item.transaction_ref}</Td>
                  <Td>{item.bank_account_last4 || '—'}</Td>
                  <Td>{item.remarks || '—'}</Td>
                </tr>
              )) : (
                <tr>
                  <td className="px-4 py-4 text-sm text-gray-500" colSpan={5}>No disbursements recorded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[status] || 'bg-gray-100 text-gray-700'}`}>{status.replace('_', ' ')}</span>
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 font-semibold text-gray-900">{value}</p>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="font-semibold text-gray-900">{value}</span>
    </div>
  )
}

function Badge({ label, active, tone }: { label: string; active: boolean; tone: 'green' | 'blue' | 'orange' }) {
  const toneClasses = {
    green: active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500',
    blue: active ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500',
    orange: active ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500',
  }
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${toneClasses[tone]}`}>{label}: {active ? 'verified' : 'pending'}</span>
}

function Th({ children }: { children: ReactNode }) {
  return <th className="px-4 py-3 text-left font-semibold text-gray-600">{children}</th>
}

function Td({ children }: { children: ReactNode }) {
  return <td className="px-4 py-3 text-gray-700">{children}</td>
}
