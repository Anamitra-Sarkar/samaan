import { useEffect, useMemo, useState } from 'react'
import { client } from '../../api/client'
import ScoreBadge from '../../components/shared/ScoreBadge'
import { usePageTitle } from '../../hooks/usePageTitle'

type Proof = {
  id: number
  loan_id: number
  file_path: string
  file_type: 'photo' | 'video'
  original_filename: string
  geolat?: number | null
  geolng?: number | null
  ai_validation_status: string
  ai_confidence_score?: number | null
  ai_remarks?: string | null
  reviewer_decision?: string | null
  review_notes?: string | null
  created_at: string
}

const PAGE_SIZE = 10

export default function OfficerReview() {
  usePageTitle('Loan Review Queue')
  const [proofs, setProofs] = useState<Proof[]>([])
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [reviewingId, setReviewingId] = useState<number | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await client.get('/loan/review-queue', {
        params: { limit: 200, ...(statusFilter ? { status: statusFilter } : {}) },
      })
      setProofs(response.data || [])
      setPage(1)
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to load the review queue.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load().catch(() => setProofs([]))
  }, [statusFilter])

  useEffect(() => {
    if (!actionSuccess) return
    const timer = window.setTimeout(() => setActionSuccess(null), 3500)
    return () => window.clearTimeout(timer)
  }, [actionSuccess])

  const totalPages = Math.max(1, Math.ceil(proofs.length / PAGE_SIZE))
  const visibleProofs = useMemo(
    () => proofs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [proofs, page]
  )

  const review = async (id: number, decision: 'approve' | 'reject') => {
    setActionError(null)
    setReviewingId(id)
    try {
      await client.patch(`/loan/proof/${id}/review`, {
        decision,
        notes: notes[id] || '',
      })
      setActionSuccess(`Proof #${id} has been ${decision === 'approve' ? 'approved' : 'rejected'}.`)
      await load()
    } catch (e: any) {
      setActionError(e.response?.data?.detail || `Failed to ${decision} proof #${id}.`)
    } finally {
      setReviewingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Loan review queue</h1>
          <p className="text-sm text-gray-500">Review AI-flagged proofs and verify upload evidence.</p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="manual_review">Manual review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
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
              <div className="mt-4 h-48 rounded-lg bg-gray-100" />
              <div className="mt-4 h-10 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {visibleProofs.map((proof) => (
              <div key={proof.id} className="rounded-xl bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="font-semibold">Proof #{proof.id}</div>
                    <div className="text-sm text-gray-500">
                      Loan #{proof.loan_id} · {proof.original_filename}
                    </div>
                    <div className="text-sm text-gray-600">{proof.ai_remarks || 'No AI remarks available.'}</div>
                    <div className="text-xs text-gray-500">
                      Geo-tag: {formatCoordinate(proof.geolat, proof.geolng)}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <ScoreBadge
                      band={
                        proof.ai_validation_status === 'approved'
                          ? 'LOW_RISK_HIGH_NEED'
                          : proof.ai_validation_status === 'rejected'
                            ? 'HIGH_RISK_LOW_NEED'
                            : 'HIGH_RISK_HIGH_NEED'
                      }
                    />
                    <span className="text-sm text-gray-500">
                      Confidence {Number(proof.ai_confidence_score ?? 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-[280px_1fr]">
                  <Preview proof={proof} />
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">Reviewer notes</label>
                    <textarea
                      value={notes[proof.id] || ''}
                      onChange={(e) => setNotes((prev) => ({ ...prev, [proof.id]: e.target.value }))}
                      placeholder="Add a review note"
                      className="min-h-28 w-full rounded-md border border-gray-300 px-3 py-2"
                    />
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => review(proof.id, 'approve')}
                        disabled={reviewingId === proof.id}
                        className="rounded-md bg-green-600 px-4 py-2 font-semibold text-white disabled:opacity-60"
                      >
                        {reviewingId === proof.id ? 'Processing...' : 'Approve'}
                      </button>
                      <button
                        onClick={() => review(proof.id, 'reject')}
                        disabled={reviewingId === proof.id}
                        className="rounded-md bg-red-600 px-4 py-2 font-semibold text-white disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm">
            <p className="text-sm text-gray-600">
              Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, proofs.length)} of {proofs.length}
            </p>
            <div className="flex items-center gap-2">
              <PagerButton onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>
                Previous
              </PagerButton>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <PagerButton onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages}>
                Next
              </PagerButton>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function Preview({ proof }: { proof: Proof }) {
  const url = getUploadsUrl(proof.file_path)
  if (proof.file_type === 'video') {
    return (
      <video controls className="h-48 w-full rounded-lg bg-black object-contain">
        <source src={url} />
      </video>
    )
  }
  return <img src={url} alt={proof.original_filename} className="h-48 w-full rounded-lg object-cover" />
}

function PagerButton({
  children,
  disabled,
  onClick,
}: {
  children: string
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  )
}

function Alert({ tone, children }: { tone: 'error' | 'success'; children: string }) {
  const className =
    tone === 'error'
      ? 'border-red-200 bg-red-50 text-red-700'
      : 'border-green-200 bg-green-50 text-green-700'
  return <div className={`rounded-lg border px-4 py-3 text-sm ${className}`}>{children}</div>
}

function formatCoordinate(lat?: number | null, lng?: number | null) {
  if (lat == null || lng == null) return 'Not provided'
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
}

function getUploadsUrl(filePath: string) {
  if (/^https?:\/\//i.test(filePath)) return filePath
  const filename = filePath.split('/').pop() || filePath
  const base = import.meta.env.VITE_API_BASE_URL || window.location.origin
  try {
    const normalized = base.replace(/\/api\/?$/, '')
    return new URL(`/uploads/${filename}`, normalized).toString()
  } catch {
    return `/uploads/${filename}`
  }
}
