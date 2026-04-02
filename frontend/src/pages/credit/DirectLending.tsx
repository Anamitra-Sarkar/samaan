import { useEffect, useState } from 'react'
import { client } from '../../api/client'
import ScoreBadge from '../../components/shared/ScoreBadge'
import { usePageTitle } from '../../hooks/usePageTitle'

export default function DirectLending() {
  usePageTitle('Direct Lending')
  const [applications, setApplications] = useState<any[]>([])

  const refresh = async () => {
    const res = await client.get('/credit/lending/applications')
    setApplications(res.data)
  }

  useEffect(() => { refresh().catch(() => setApplications([])) }, [])

  const decide = async (id: number, decision: 'approve' | 'reject') => {
    await client.patch(`/credit/lending/${id}/decision`, { decision, notes: decision === 'approve' ? 'Approved by bank officer' : 'Rejected after review' })
    await refresh()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Direct lending</h1>
        <p className="text-sm text-gray-500">Bank officers can review and decide on beneficiary applications.</p>
      </div>

      <div className="space-y-4">
        {applications.map((app) => (
          <div key={app.id} className="rounded-xl bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="font-semibold">Application #{app.id}</div>
                <div className="text-sm text-gray-500">Beneficiary #{app.beneficiary_id} · {app.purpose}</div>
              </div>
              <ScoreBadge band={app.status === 'approved' ? 'LOW_RISK_HIGH_NEED' : app.status === 'rejected' ? 'HIGH_RISK_LOW_NEED' : 'HIGH_RISK_HIGH_NEED'} />
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button onClick={() => decide(app.id, 'approve')} className="rounded-md bg-green-600 px-4 py-2 text-white">Approve</button>
              <button onClick={() => decide(app.id, 'reject')} className="rounded-md bg-red-600 px-4 py-2 text-white">Reject</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
