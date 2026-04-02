import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { client } from '../../api/client'
import ScoreBadge from '../../components/shared/ScoreBadge'
import { usePageTitle } from '../../hooks/usePageTitle'

type LendingApplication = {
  id: number
  beneficiary_id: number
  requested_amount: number
  purpose: string
  tenure_months: number
  status: 'pending' | 'approved' | 'rejected'
  approved_amount?: number | null
  approval_notes?: string | null
  rejection_reason?: string | null
  created_at: string
}

type ScoreDetail = {
  id: number
  beneficiary_id: number
  composite_score: number
  risk_band: string
  score_explanation?: Record<string, unknown> | null
  scored_at: string
}

export default function DirectLending() {
  usePageTitle('Direct Lending')
  const [applications, setApplications] = useState<LendingApplication[]>([])
  const [scoreByBeneficiary, setScoreByBeneficiary] = useState<Record<number, ScoreDetail>>({})
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const refresh = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await client.get('/credit/lending/applications')
      const items: LendingApplication[] = res.data || []
      setApplications(items)

      const uniqueBeneficiaries = [...new Set(items.map((item) => item.beneficiary_id))]
      const scores = await Promise.all(
        uniqueBeneficiaries.map(async (beneficiaryId) => {
          const score = await client.get(`/credit/score/${beneficiaryId}`)
          return [beneficiaryId, score.data] as const
        })
      )
      setScoreByBeneficiary(Object.fromEntries(scores))
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to load lending applications.')
      setApplications([])
      setScoreByBeneficiary({})
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh().catch(() => setApplications([]))
  }, [])

  useEffect(() => {
    if (!actionSuccess) return
    const timer = window.setTimeout(() => setActionSuccess(null), 3500)
    return () => window.clearTimeout(timer)
  }, [actionSuccess])

  const sortedApplications = useMemo(
    () => [...applications].sort((a, b) => b.id - a.id),
    [applications]
  )

  const decide = async (id: number, decision: 'approve' | 'reject') => {
    setActionError(null)
    setSavingId(id)
    try {
      await client.patch(`/credit/lending/${id}/decision`, {
        decision,
        notes: notes[id] || '',
      })
      setActionSuccess(`Application #${id} has been ${decision === 'approve' ? 'approved' : 'rejected'}.`)
      await refresh()
    } catch (e: any) {
      setActionError(e.response?.data?.detail || `Failed to ${decision} application #${id}.`)
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Direct lending</h1>
        <p className="text-sm text-gray-500">Bank officers can review application detail, score context, and approve or reject with notes.</p>
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {actionError && <Alert tone="error">{actionError}</Alert>}
      {actionSuccess && <Alert tone="success">{actionSuccess}</Alert>}

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="animate-pulse rounded-xl bg-white p-5 shadow-sm">
              <div className="h-4 w-1/3 rounded bg-gray-200" />
              <div className="mt-3 h-3 w-1/2 rounded bg-gray-200" />
              <div className="mt-4 h-24 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {sortedApplications.map((app) => {
            const score = scoreByBeneficiary[app.beneficiary_id]
            return (
              <div key={app.id} className="rounded-xl bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold">Application #{app.id}</div>
                    <div className="text-sm text-gray-500">
                      Beneficiary #{app.beneficiary_id} · {app.purpose} · {app.tenure_months} months
                    </div>
                  </div>
                  <ScoreBadge band={score?.risk_band || 'HIGH_RISK_HIGH_NEED'} />
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="space-y-3 rounded-lg bg-gray-50 p-4">
                    <DetailRow label="Requested amount" value={formatCurrency(app.requested_amount)} />
                    <DetailRow label="Approved amount" value={app.approved_amount ? formatCurrency(app.approved_amount) : 'Not decided'} />
                    <DetailRow label="Status" value={app.status} />
                    <DetailRow label="Created at" value={new Date(app.created_at).toLocaleString()} />
                    <button
                      type="button"
                      onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}
                      className="rounded-md border border-[#01696f] px-4 py-2 text-sm font-semibold text-[#01696f]"
                    >
                      {expandedId === app.id ? 'Hide score details' : 'Show score details'}
                    </button>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">Decision notes</label>
                    <textarea
                      value={notes[app.id] || app.approval_notes || app.rejection_reason || ''}
                      onChange={(e) => setNotes((prev) => ({ ...prev, [app.id]: e.target.value }))}
                      className="min-h-28 w-full rounded-md border border-gray-300 px-3 py-2"
                      placeholder="Write approval or rejection notes"
                    />
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => decide(app.id, 'approve')}
                        disabled={savingId === app.id}
                        className="rounded-md bg-green-600 px-4 py-2 font-semibold text-white disabled:opacity-60"
                      >
                        {savingId === app.id ? 'Saving...' : 'Approve'}
                      </button>
                      <button
                        type="button"
                        onClick={() => decide(app.id, 'reject')}
                        disabled={savingId === app.id}
                        className="rounded-md bg-red-600 px-4 py-2 font-semibold text-white disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>

                {expandedId === app.id && (
                  <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
                    {score ? (
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <DetailRow label="Credit score" value={score.composite_score.toFixed(1)} />
                          <DetailRow label="Risk band" value={<ScoreBadge band={score.risk_band} />} />
                          <DetailRow label="Scored at" value={new Date(score.scored_at).toLocaleString()} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">SHAP explanation</p>
                          <div className="mt-2">
                            <ShapList explanation={score.score_explanation} />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No score details available for this application.</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ShapList({ explanation }: { explanation?: Record<string, unknown> | null }) {
  const entries = normalizeExplanation(explanation).slice(0, 3)
  if (!entries.length) return <span className="text-sm text-gray-500">No SHAP explanation available.</span>
  return (
    <ul className="space-y-1 text-sm">
      {entries.map(([feature, value]) => (
        <li key={feature}>
          <span className="font-medium">{feature}</span>{' '}
          <span className={value >= 0 ? 'text-green-700' : 'text-red-700'}>
            {value >= 0 ? '+' : ''}
            {value.toFixed(2)}
          </span>
        </li>
      ))}
    </ul>
  )
}

function normalizeExplanation(explanation?: Record<string, unknown> | null) {
  if (!explanation) return [] as Array<[string, number]>
  const direct = (explanation.top_features || explanation.shap_values || explanation.features) as unknown
  if (Array.isArray(direct)) {
    const pairs = direct
      .map((item: any) => {
        if (Array.isArray(item) && item.length >= 2) return [String(item[0]), Number(item[1])] as [string, number]
        if (item && typeof item === 'object') {
          return [String(item.feature ?? item.name ?? 'feature'), Number(item.value ?? item.shap_value ?? item.weight ?? 0)] as [string, number]
        }
        return null
      })
      .filter(Boolean) as Array<[string, number]>
    return pairs.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
  }
  return Object.entries(explanation)
    .map(([key, value]) => [key, Number(value)] as [string, number])
    .filter(([, value]) => Number.isFinite(value))
    .filter(([key]) => !['composite_score', 'risk_band', 'repayment_score', 'income_score', 'summary'].includes(key))
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
}

function DetailRow({ label, value }: { label: string; value: string | number | ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  )
}

function Alert({ tone, children }: { tone: 'error' | 'success'; children: string }) {
  const className =
    tone === 'error'
      ? 'border-red-200 bg-red-50 text-red-700'
      : 'border-green-200 bg-green-50 text-green-700'
  return <div className={`rounded-lg border px-4 py-3 text-sm ${className}`}>{children}</div>
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)
}
