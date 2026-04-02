import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { client } from '../../api/client'
import { useAuthStore } from '../../store/authStore'

import { usePageTitle } from '../../hooks/usePageTitle'

const schema = z.object({
  victim_id: z.coerce.number().optional(),
  case_id: z.coerce.number().optional(),
  category: z.enum(['delay', 'wrong_amount', 'harassment', 'other']),
  description: z.string().min(5),
})

type Values = z.infer<typeof schema>

type Grievance = {
  id: number
  case_id?: number | null
  victim_id?: number | null
  category: 'delay' | 'wrong_amount' | 'harassment' | 'other'
  description: string
  status: 'open' | 'in_progress' | 'resolved'
  created_at: string
  resolution_notes?: string | null
  resolved_at?: string | null
}

const statusStyles: Record<Grievance['status'], string> = {
  open: 'bg-red-100 text-red-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-green-100 text-green-700',
}

export default function GrievancePortal() {
  const { user } = useAuthStore()
  const [items, setItems] = useState<Grievance[]>([])
  const [selectedStatus, setSelectedStatus] = useState<'all' | Grievance['status']>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [resolveId, setResolveId] = useState<number | null>(null)
  const [resolutionNotes, setResolutionNotes] = useState('')

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { category: 'delay' },
  })

  usePageTitle('Grievance Portal')

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await client.get('/dbt/grievance')
      setItems(res.data.items || [])
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to load grievances')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load().catch(() => setItems([]))
  }, [])

  useEffect(() => {
    if (!success) return
    const timer = window.setTimeout(() => setSuccess(null), 3500)
    return () => window.clearTimeout(timer)
  }, [success])

  const filtered = useMemo(() => {
    return items.filter((item) => (selectedStatus === 'all' ? true : item.status === selectedStatus))
  }, [items, selectedStatus])

  const onSubmit = async (values: Values) => {
    setError(null)
    try {
      await client.post('/dbt/grievance', values)
      form.reset({ category: 'delay', description: '', victim_id: undefined, case_id: undefined })
      setSuccess('Grievance submitted successfully.')
      await load()
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to submit grievance')
    }
  }

  const resolveGrievance = async (id: number) => {
    setError(null)
    try {
      await client.patch(`/dbt/grievance/${id}/resolve`, { resolution_notes: resolutionNotes })
      setResolveId(null)
      setResolutionNotes('')
      setSuccess('Grievance resolved successfully.')
      await load()
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to resolve grievance')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Grievance portal</h1>
        <p className="text-sm text-gray-500">Submit and track DBT grievances with resolution workflow.</p>
      </div>

      {success && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 rounded-xl bg-white p-6 shadow-sm md:grid-cols-2">
        <Field label="Victim ID" error={form.formState.errors.victim_id?.message}>
          <input {...form.register('victim_id')} className={inputClass} placeholder="Victim ID" />
        </Field>
        <Field label="Case ID" error={form.formState.errors.case_id?.message}>
          <input {...form.register('case_id')} className={inputClass} placeholder="Case ID" />
        </Field>
        <Field label="Category" error={form.formState.errors.category?.message}>
          <select {...form.register('category')} className={inputClass}>
            <option value="delay">Delay</option>
            <option value="wrong_amount">Wrong amount</option>
            <option value="harassment">Harassment</option>
            <option value="other">Other</option>
          </select>
        </Field>
        <Field label="Description" error={form.formState.errors.description?.message}>
          <textarea {...form.register('description')} className={inputClass} rows={4} placeholder="Describe the grievance" />
        </Field>
        <div className="md:col-span-2">
          <button disabled={form.formState.isSubmitting} className="rounded-md bg-[#01696f] px-4 py-2 font-semibold text-white disabled:opacity-50">
            {form.formState.isSubmitting ? 'Submitting...' : 'Submit grievance'}
          </button>
        </div>
      </form>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {[
            ['all', 'All'],
            ['open', 'Open'],
            ['in_progress', 'In Progress'],
            ['resolved', 'Resolved'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setSelectedStatus(value as typeof selectedStatus)}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${selectedStatus === value ? 'bg-[#01696f] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-80 animate-pulse rounded-xl bg-gray-200" />
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <Th>Ticket</Th>
                <Th>Category</Th>
                <Th>Status</Th>
                <Th>Description</Th>
                <Th>Created date</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((row) => (
                <FragmentRow
                  key={row.id}
                  row={row}
                  canResolve={user?.role === 'state_officer' || user?.role === 'admin'}
                  resolveId={resolveId}
                  setResolveId={setResolveId}
                  resolutionNotes={resolutionNotes}
                  setResolutionNotes={setResolutionNotes}
                  onResolve={resolveGrievance}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function FragmentRow({
  row,
  canResolve,
  resolveId,
  setResolveId,
  resolutionNotes,
  setResolutionNotes,
  onResolve,
}: {
  row: Grievance
  canResolve: boolean
  resolveId: number | null
  setResolveId: (value: number | null) => void
  resolutionNotes: string
  setResolutionNotes: (value: string) => void
  onResolve: (id: number) => Promise<void>
}) {
  return (
    <>
      <tr>
        <Td>{row.id}</Td>
        <Td>{row.category}</Td>
        <Td><StatusBadge status={row.status} /></Td>
        <Td>{row.description}</Td>
        <Td>{new Date(row.created_at).toLocaleString()}</Td>
        <Td>
          {canResolve && row.status !== 'resolved' ? (
            <button
              type="button"
              onClick={() => setResolveId(resolveId === row.id ? null : row.id)}
              className="rounded-md border border-[#01696f] px-3 py-2 text-xs font-semibold text-[#01696f]"
            >
              Resolve
            </button>
          ) : (
            <span className="text-xs text-gray-500">—</span>
          )}
        </Td>
      </tr>
      {resolveId === row.id && canResolve && (
        <tr>
          <td colSpan={6} className="bg-gray-50 px-4 py-4">
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">Resolution notes</label>
              <textarea
                value={resolutionNotes}
                onChange={(event) => setResolutionNotes(event.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                rows={4}
              />
              <div className="mt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => onResolve(row.id)}
                  className="rounded-md bg-[#01696f] px-4 py-2 text-sm font-semibold text-white"
                >
                  Mark resolved
                </button>
                <button
                  type="button"
                  onClick={() => setResolveId(null)}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function StatusBadge({ status }: { status: Grievance['status'] }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[status]}`}>{status.replace('_', ' ')}</span>
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
  return <td className="px-4 py-3 align-top text-gray-700">{children}</td>
}

const inputClass = 'w-full rounded-md border border-gray-300 px-3 py-2'
