import { useEffect, useState } from 'react'
import { client } from '../../api/client'
import DataTable from '../../components/shared/DataTable'
import ScoreBadge from '../../components/shared/ScoreBadge'

export default function CreditScoreView() {
  const [rows, setRows] = useState<any[]>([])
  const [band, setBand] = useState('')
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    Promise.all([
      client.get('/credit/beneficiaries', { params: band ? { risk_band: band } : undefined }),
      client.get('/credit/dashboard'),
    ])
      .then(([list, dashboard]) => {
        setRows(list.data.items || [])
        setStats(dashboard.data)
      })
      .catch(() => setRows([]))
  }, [band])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Beneficiary credit scores</h1>
          <p className="text-sm text-gray-500">Review the latest composite score and risk band.</p>
        </div>
        <select value={band} onChange={(e) => setBand(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2">
          <option value="">All risk bands</option>
          <option value="LOW_RISK_HIGH_NEED">Low Risk / High Need</option>
          <option value="LOW_RISK_LOW_NEED">Low Risk / Low Need</option>
          <option value="HIGH_RISK_HIGH_NEED">High Risk / High Need</option>
          <option value="HIGH_RISK_LOW_NEED">High Risk / Low Need</option>
        </select>
      </div>

      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Total beneficiaries" value={stats.total_beneficiaries} />
          <StatCard label="Average score" value={stats.average_score} />
          <StatCard label="Pending applications" value={stats.pending_applications} />
          <StatCard label="Approved applications" value={stats.approved_applications} />
        </div>
      )}

      <DataTable
        data={rows}
        rowKey={(row) => row.id}
        columns={[
          { key: 'beneficiary_id', label: 'Beneficiary' },
          { key: 'composite_score', label: 'Score', render: (row) => row.composite_score.toFixed(1) },
          { key: 'risk_band', label: 'Risk band', render: (row) => <ScoreBadge band={row.risk_band} /> },
          { key: 'scored_at', label: 'Scored at', render: (row) => new Date(row.scored_at).toLocaleString() },
        ]}
      />
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  )
}

