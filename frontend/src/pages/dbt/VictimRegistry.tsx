import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { client } from '../../api/client'

const states = ['Uttar Pradesh', 'Bihar', 'Rajasthan', 'Madhya Pradesh', 'Maharashtra', 'Other'] as const

const registerSchema = z.object({
  name: z.string().min(2, 'Full name is required'),
  aadhaar_last4: z.string().regex(/^\d{4}$/, 'Aadhaar last 4 digits are required'),
  mobile: z.string().regex(/^\d{10}$/, 'Mobile number must be 10 digits'),
  state: z.enum(states),
  district: z.string().min(2, 'District is required'),
  case_type: z.enum(['pcr', 'poa']),
  fir_number: z.string().min(2, 'FIR number is required'),
  court_case_number: z.string().optional(),
  incident_date: z.string().min(1, 'Incident date is required'),
})

const createCaseSchema = z.object({
  assistance_type: z.enum(['relief', 'rehabilitation', 'inter_caste_marriage_incentive']),
  approved_amount: z.coerce.number().min(1, 'Approved amount is required'),
})

type RegisterValues = z.infer<typeof registerSchema>
type CreateCaseValues = z.infer<typeof createCaseSchema>

type VictimRow = {
  id: number
  name: string
  case_type: 'pcr' | 'poa'
  state: string
  fir_number: string
  verification_status: 'pending' | 'verified' | 'rejected'
  aadhaar_verified: boolean
  digilocker_verified: boolean
  cctns_verified: boolean
  mobile: string
  district: string
}

type VerificationResult = {
  victim: VictimRow
  aadhaar_verified: boolean
  digilocker_verified: boolean
  digilocker_documents: string[]
  cctns_verified: boolean
  cctns_case_status: string
}

export default function VictimRegistry() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<VictimRow[]>([])
  const [registerOpen, setRegisterOpen] = useState(false)
  const [registerSuccess, setRegisterSuccess] = useState<string | null>(null)
  const [verifyingId, setVerifyingId] = useState<number | null>(null)
  const [verificationById, setVerificationById] = useState<Record<number, VerificationResult>>({})
  const [createOpenFor, setCreateOpenFor] = useState<number | null>(null)

  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      state: 'Uttar Pradesh',
      case_type: 'pcr',
      incident_date: new Date().toISOString().slice(0, 10),
    },
  })

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await client.get('/dbt/victims')
        setRows(res.data.items || [])
      } catch (e: any) {
        setError(e.response?.data?.detail || 'Failed to load victims')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (!registerSuccess) return
    const timer = window.setTimeout(() => setRegisterSuccess(null), 3000)
    return () => window.clearTimeout(timer)
  }, [registerSuccess])

  const verifiedIds = useMemo(
    () => new Set(rows.filter((row) => row.verification_status === 'verified').map((row) => row.id)),
    [rows],
  )

  const refresh = async () => {
    const res = await client.get('/dbt/victims')
    setRows(res.data.items || [])
  }

  const onRegister = async (values: RegisterValues) => {
    setError(null)
    try {
      await client.post('/dbt/register-victim', {
        ...values,
        incident_date: new Date(values.incident_date).toISOString(),
      })
      registerForm.reset({
        name: '',
        aadhaar_last4: '',
        mobile: '',
        state: 'Uttar Pradesh',
        district: '',
        case_type: 'pcr',
        fir_number: '',
        court_case_number: '',
        incident_date: new Date().toISOString().slice(0, 10),
      })
      setRegisterOpen(false)
      setRegisterSuccess('Victim registered successfully.')
      await refresh()
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to register victim')
    }
  }

  const verifyVictim = async (id: number) => {
    setVerifyingId(id)
    setError(null)
    try {
      const res = await client.post(`/dbt/verify/${id}`)
      setVerificationById((prev) => ({ ...prev, [id]: res.data }))
      await refresh()
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to verify victim')
    } finally {
      setVerifyingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Victim registry</h1>
          <p className="text-sm text-gray-500">Track PCR/POA victims and create DBT cases after verification.</p>
        </div>
        <button
          type="button"
          onClick={() => setRegisterOpen((value) => !value)}
          className="rounded-md bg-[#01696f] px-4 py-2 text-sm font-semibold text-white"
        >
          Register New Victim
        </button>
      </div>

      {registerSuccess && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{registerSuccess}</div>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {registerOpen && (
        <form onSubmit={registerForm.handleSubmit(onRegister)} className="rounded-xl bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Full name" error={registerForm.formState.errors.name?.message}>
              <input {...registerForm.register('name')} className={inputClass} />
            </Field>
            <Field label="Aadhaar last 4 digits" error={registerForm.formState.errors.aadhaar_last4?.message}>
              <input {...registerForm.register('aadhaar_last4')} maxLength={4} className={inputClass} />
            </Field>
            <Field label="Mobile number" error={registerForm.formState.errors.mobile?.message}>
              <input {...registerForm.register('mobile')} maxLength={10} className={inputClass} />
            </Field>
            <Field label="State" error={registerForm.formState.errors.state?.message}>
              <select {...registerForm.register('state')} className={inputClass}>
                {states.map((state) => <option key={state} value={state}>{state}</option>)}
              </select>
            </Field>
            <Field label="District" error={registerForm.formState.errors.district?.message}>
              <input {...registerForm.register('district')} className={inputClass} />
            </Field>
            <Field label="FIR number" error={registerForm.formState.errors.fir_number?.message}>
              <input {...registerForm.register('fir_number')} className={inputClass} />
            </Field>
            <Field label="Court case number" error={registerForm.formState.errors.court_case_number?.message}>
              <input {...registerForm.register('court_case_number')} className={inputClass} />
            </Field>
            <Field label="Incident date" error={registerForm.formState.errors.incident_date?.message}>
              <input {...registerForm.register('incident_date')} type="date" className={inputClass} />
            </Field>
            <div className="md:col-span-2">
              <p className="mb-2 text-sm font-medium text-gray-700">Case type</p>
              <div className="flex gap-6">
                {(['pcr', 'poa'] as const).map((value) => (
                  <label key={value} className="flex items-center gap-2 text-sm">
                    <input type="radio" value={value} {...registerForm.register('case_type')} />
                    {value.toUpperCase()}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button disabled={registerForm.formState.isSubmitting} className="rounded-md bg-[#01696f] px-4 py-2 font-semibold text-white disabled:opacity-50">
              {registerForm.formState.isSubmitting ? 'Registering...' : 'Save victim'}
            </button>
            <button type="button" onClick={() => setRegisterOpen(false)} className="rounded-md border border-gray-300 px-4 py-2 font-semibold text-gray-700">
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="h-80 animate-pulse rounded-xl bg-gray-200" />
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <Th>Name</Th>
                <Th>Case Type</Th>
                <Th>State</Th>
                <Th>FIR Number</Th>
                <Th>Verification Status</Th>
                <Th>Aadhaar Verified</Th>
                <Th>DigiLocker</Th>
                <Th>CCTNS</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => {
                const verification = verificationById[row.id]
                const verified = verifiedIds.has(row.id) || row.verification_status === 'verified' || verification?.victim.verification_status === 'verified'
                return (
                  <tr key={row.id} className="align-top">
                    <Td>{row.name}</Td>
                    <Td>{row.case_type.toUpperCase()}</Td>
                    <Td>{row.state}</Td>
                    <Td>{row.fir_number}</Td>
                    <Td><StatusBadge status={row.verification_status} /></Td>
                    <Td>{verified ? '✓' : '✗'}</Td>
                    <Td>{row.digilocker_verified || verification?.digilocker_verified ? '✓' : '✗'}</Td>
                    <Td>{row.cctns_verified || verification?.cctns_verified ? '✓' : '✗'}</Td>
                    <Td>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => verifyVictim(row.id)}
                          disabled={verifyingId === row.id}
                          className="rounded-md bg-gray-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                        >
                          {verifyingId === row.id ? 'Verifying...' : 'Verify'}
                        </button>
                        <button
                          type="button"
                          disabled={!verified}
                          onClick={() => setCreateOpenFor((current) => (current === row.id ? null : row.id))}
                          className="rounded-md border border-[#01696f] px-3 py-2 text-xs font-semibold text-[#01696f] disabled:opacity-40"
                        >
                          Create DBT Case
                        </button>
                      </div>
                      {verification && (
                        <div className="mt-3 rounded-lg bg-gray-50 p-3 text-xs text-gray-700">
                          <p>Aadhaar: {verification.aadhaar_verified ? 'verified' : 'not verified'}</p>
                          <p className="mt-1">DigiLocker docs: {verification.digilocker_documents.join(', ') || 'None'}</p>
                          <p className="mt-1">CCTNS: {verification.cctns_case_status}</p>
                        </div>
                      )}
                      {createOpenFor === row.id && verified && (
                        <CreateCaseForm
                          victimId={row.id}
                          onDone={async () => {
                            setCreateOpenFor(null)
                            await refresh()
                          }}
                        />
                      )}
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function CreateCaseForm({ victimId, onDone }: { victimId: number; onDone: () => Promise<void> }) {
  const form = useForm<CreateCaseValues>({
    resolver: zodResolver(createCaseSchema),
    defaultValues: {
      assistance_type: 'relief',
      approved_amount: 10000,
    },
  })
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (values: CreateCaseValues) => {
    setError(null)
    try {
      await client.post('/dbt/create-case', {
        victim_id: victimId,
        ...values,
      })
      await onDone()
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to create DBT case')
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="mt-3 space-y-3 rounded-lg border border-gray-200 bg-white p-3">
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Assistance type" error={form.formState.errors.assistance_type?.message}>
          <select {...form.register('assistance_type')} className={inputClass}>
            <option value="relief">Relief</option>
            <option value="rehabilitation">Rehabilitation</option>
            <option value="inter_caste_marriage_incentive">Inter-caste marriage incentive</option>
          </select>
        </Field>
        <Field label="Approved amount" error={form.formState.errors.approved_amount?.message}>
          <input {...form.register('approved_amount')} type="number" className={inputClass} />
        </Field>
      </div>
      {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
      <button disabled={form.formState.isSubmitting} className="rounded-md bg-[#01696f] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
        {form.formState.isSubmitting ? 'Creating...' : 'Submit case'}
      </button>
    </form>
  )
}

function StatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-700',
    verified: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  }
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${classes[status] || classes.pending}`}>{status}</span>
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      {children}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </label>
  )
}

function Th({ children }: { children: ReactNode }) {
  return <th className="px-4 py-3 text-left font-semibold text-gray-600">{children}</th>
}

function Td({ children }: { children: ReactNode }) {
  return <td className="px-4 py-3 text-gray-700">{children}</td>
}

const inputClass = 'w-full rounded-md border border-gray-300 px-3 py-2'
