import { useEffect, useState } from 'react'
import { client } from '../../api/client'
import ScoreBadge from '../../components/shared/ScoreBadge'
import { usePageTitle } from '../../hooks/usePageTitle'

export default function OfficerReview() {
  usePageTitle('Loan Review Queue')
  const [proofs, setProofs] = useState<any[]>([])
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [statusFilter, setStatusFilter] = useState('')

  const load = async () => {
    const response = await client.get('/loan/review-queue', {
      params: statusFilter ? { status: statusFilter } : undefined,
    })
    setProofs(response.data)
  }

  useEffect(() => { load().catch(() => setProofs([])) }, [statusFilter])

  const review = async (id: number, decision: 'approve' | 'reject') => {
    await client.patch(`/loan/proof/${id}/review`, { decision, notes: notes[id] || '' })
    await load()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Loan review queue</h1>
          <p className="text-sm text-gray-500">Review AI-flagged or pending proofs.</p>
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="manual_review">Manual review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="space-y-4">
        {proofs.map((proof) => (
          <div key={proof.id} className="rounded-xl bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="font-semibold">Proof #{proof.id}</div>
                <div className="text-sm text-gray-500">Loan #{proof.loan_id} · {proof.original_filename}</div>
                <div className="mt-2 text-sm text-gray-600">{proof.ai_remarks}</div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <ScoreBadge band={proof.ai_validation_status === 'approved' ? 'LOW_RISK_HIGH_NEED' : proof.ai_validation_status === 'rejected' ? 'HIGH_RISK_LOW_NEED' : 'HIGH_RISK_HIGH_NEED'} />
                <span className="text-sm text-gray-500">Confidence {Number(proof.ai_confidence_score ?? 0).toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto]">
              <input
                value={notes[proof.id] || ''}
                onChange={(e) => setNotes((prev) => ({ ...prev, [proof.id]: e.target.value }))}
                placeholder="Reviewer notes"
                className="rounded-md border border-gray-300 px-3 py-2"
              />
              <button onClick={() => review(proof.id, 'approve')} className="rounded-md bg-green-600 px-4 py-2 font-semibold text-white">Approve</button>
              <button onClick={() => review(proof.id, 'reject')} className="rounded-md bg-red-600 px-4 py-2 font-semibold text-white">Reject</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

