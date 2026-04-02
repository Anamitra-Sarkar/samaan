import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { client } from '../../api/client'

import { usePageTitle } from '../../hooks/usePageTitle'

const sanctionSchema = z.object({
  approved_amount: z.coerce.number().min(1, 'Approved amount is required'),
})

type SanctionValues = z.infer<typeof sanctionSchema>

type CaseRow = {
  id: number
  victim_name: string
  victim_state: string
  case_type: string
  status: 'registered' | 'under_review' | 'sanctioned' | 'disbursed' | 'closed'
  approved_amount: number
  disbursed_amount: number
  assigned_officer?: string | null
  created_at: string
}

type Filters = {
  status: string
  case_type: string
  state: string
}

export default function DisbursementTracker() {
  usePageTitle('Disbursement Tracker')
  const navigate = useNavigate()
  const [filters, setFilters] = useState<Filters>({ status: '', case_type: '', state: '' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<CaseRow[]>([])
  const [success, setSuccess] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await client.get('/dbt/cases', {
        params: {
          ...(filters.status ? { status: filters.status } : {}),
          ...(filters.case_type ? { case_type: filters.case_type } : {}),
          ...(filters.state ? { state: filters.state } : {}),
        },
      })
      setRows(res.data.items || [])
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to load DBT cases')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [filters.status, filters.case_type, filters.state])

  useEffect(() => {
    if (!success) return
    const timer = window.setTimeout(() => setSuccess(null), 3000)
    return () => window.clearTimeout(timer)
  }, [success])

  const stats = useMemo(() => {
    const totalCases = rows.length
    const totalDisbursed = rows.reduce((sum, row) => sum + Number(row.disbursed_amount || 0), 0)
    const pendingCases = rows.filter((row) => row.status === 'registered' || row.status === 'under_review').length
    const disbursedCases = rows.filter((row) => row.status === 'disbursed')
    const avgDays = disbursedCases.length
      ? disbursedCases.reduce((sum, row) => sum + Math.max(0, (Date.now() - new Date(row.created_at).getTime()) / 86400000), 0) / disbursedCases.length
      : 0
    return { totalCases, totalDisbursed, pendingCases, avgDays }
  }, [rows])

  const states = useMemo(() => Array.from(new Set(rows.map((row) => row.victim_state))).sort(), [rows])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Disbursement tracker</h1>
          <p className="text-sm text-gray-500">Track sanctioning and disbursement across DBT cases.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Select value={filters.status} onChange={(value) => setFilters((current) => ({ ...current, status: value }))}>
            <option value="">All statuses</option>
            <option value="registered">Registered</option>
            <option value="under_review">Under review</option>
            <option value="sanctioned">Sanctioned</option>
            <option value="disbursed">Disbursed</option>
            <option value="closed">Closed</option>
          </Select>
          <Select value={filters.case_type} onChange={(value) => setFilters((current) => ({ ...current, case_type: value }))}>
            <option value="">All case types</option>
            <option value="pcr">PCR</option>
            <option value="poa">POA</option>
          </Select>
          <Select value={filters.state} onChange={(value) => setFilters((current) => ({ ...current, state: value }))}>
            <option value="">All states</option>
            {states.map((state) => <option key={state} value={state}>{state}</option>)}
          </Select>
        </div>
      </div>

      {success && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Total cases" value={stats.totalCases} />
        <Stat label="Total disbursed" value={`₹${stats.totalDisbursed.toLocaleString()}`} />
        <Stat label="Pending cases" value={stats.pendingCases} />
        <Stat label="Avg days to disburse" value={stats.avgDays.toFixed(1)} />
      </div>

      {loading ? (
        <div className="h-80 animate-pulse rounded-xl bg-gray-200" />
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <Th>Case ID</Th>
                <Th>Victim Name</Th>
                <Th>Assistance Type</Th>
                <Th>Approved Amount</Th>
                <Th>Disbursed Amount</Th>
                <Th>Status</Th>
                <Th>Assigned Officer</Th>
                <Th>Created Date</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => (
                <CaseRow
                  key={row.id}
                  row={row}
                  onSuccess={(message) => {
                    setSuccess(message)
                    load()
                  }}
                  onTimeline={() => navigate(`/dbt/case/${row.id}`)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function CaseRow({
  row,
  onSuccess,
  onTimeline,
}: {
  row: CaseRow
  onSuccess: (message: string) => void
  onTimeline: () => void
}) {
  const [showSanction, setShowSanction] = useState(false)
  const [busy, setBusy] = useState(false)
  const [rowError, setRowError] = useState<string | null>(null)

  const form = useForm<SanctionValues>({
    resolver: zodResolver(sanctionSchema),
    defaultValues: { approved_amount: row.approved_amount },
  })

  const sanction = async (values: SanctionValues) => {
    setBusy(true)
    setRowError(null)
    try {
      await client.patch(`/dbt/case/${row.id}/sanction`, values)
      setShowSanction(false)
      onSuccess(`Case #${row.id} sanctioned successfully.`)
    } catch (e: any) {
      setRowError(e.response?.data?.detail || 'Failed to sanction case')
    } finally {
      setBusy(false)
    }
  }

  const disburse = async () => {
    setBusy(true)
    setRowError(null)
    try {
      const res = await client.post(`/dbt/case/${row.id}/disburse`, {})
      onSuccess(`Disbursement recorded with reference ${res.data.transaction_ref}`)
    } catch (e: any) {
      setRowError(e.response?.data?.detail || 'Failed to disburse case')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <tr className="align-top">
        <Td>{row.id}</Td>
        <Td>{row.victim_name}</Td>
        <Td>{row.case_type.toUpperCase()}</Td>
        <Td>₹{Number(row.approved_amount).toLocaleString()}</Td>
        <Td>₹{Number(row.disbursed_amount).toLocaleString()}</Td>
        <Td><StatusBadge status={row.status} /></Td>
        <Td>{row.assigned_officer || 'Unassigned'}</Td>
        <Td>{new Date(row.created_at).toLocaleDateString()}</Td>
        <Td>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowSanction((value) => !value)}
              disabled={row.status !== 'under_review'}
              className="rounded-md border border-[#01696f] px-3 py-2 text-xs font-semibold text-[#01696f] disabled:opacity-40"
            >
              Sanction
            </button>
            <button
              type="button"
              onClick={disburse}
              disabled={row.status !== 'sanctioned' || busy}
              className="rounded-md bg-[#01696f] px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
            >
              Disburse
            </button>
            <button type="button" onClick={onTimeline} className="rounded-md bg-gray-900 px-3 py-2 text-xs font-semibold text-white">
              View Timeline
            </button>
          </div>
          {showSanction && row.status === 'under_review' && (
            <form onSubmit={form.handleSubmit(sanction)} className="mt-3 space-y-2 rounded-lg border border-gray-200 bg-white p-3">
              <label className="block text-xs font-medium text-gray-700">Approved amount</label>
              <input {...form.register('approved_amount')} type="number" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              {form.formState.errors.approved_amount && <p className="text-xs text-red-600">{form.formState.errors.approved_amount.message}</p>}
              {rowError && <p className="text-xs text-red-600">{rowError}</p>}
              <button disabled={busy || form.formState.isSubmitting} className="rounded-md bg-[#01696f] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
                {busy ? 'Saving...' : 'Confirm sanction'}
              </button>
            </form>
          )}
          {rowError && !showSanction && <p className="mt-2 text-xs text-red-600">{rowError}</p>}
        </Td>
      </tr>
    </>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

function Select({ value, onChange, children }: { value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
      {children}
    </select>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    registered: 'bg-gray-100 text-gray-700',
    under_review: 'bg-orange-100 text-orange-700',
    sanctioned: 'bg-blue-100 text-blue-700',
    disbursed: 'bg-green-100 text-green-700',
    closed: 'bg-purple-100 text-purple-700',
  }
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${styles[status] || styles.registered}`}>{status.replace('_', ' ')}</span>
}

function Th({ children }: { children: ReactNode }) {
  return <th className="px-4 py-3 text-left font-semibold text-gray-600">{children}</th>
}

function Td({ children }: { children: ReactNode }) {
  return <td className="px-4 py-3 text-gray-700">{children}</td>
}
