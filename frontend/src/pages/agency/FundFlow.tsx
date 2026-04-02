import { useEffect, useState } from 'react'
import { client } from '../../api/client'

import { usePageTitle } from '../../hooks/usePageTitle'

export default function FundFlow() {
  usePageTitle('Fund Flow')
  const [data, setData] = useState<any>(null)
  const [dashboard, setDashboard] = useState<any>(null)

  useEffect(() => {
    Promise.all([client.get('/agency/fund-flow'), client.get('/agency/mapping/dashboard')]).then(([flow, dash]) => {
      setData(flow.data)
      setDashboard(dash.data)
    }).catch(() => null)
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Fund flow</h1>
        <p className="text-sm text-gray-500">Allocated vs released vs utilized by state and component.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card label="Total agencies" value={dashboard?.total_agencies ?? '—'} />
        <Card label="Total mappings" value={dashboard?.total_mappings ?? '—'} />
        <Card label="Utilization rate" value={`${dashboard?.fund_utilization_rate ?? 0}%`} />
      </div>
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <pre className="overflow-auto text-xs">{JSON.stringify(data, null, 2)}</pre>
      </div>
    </div>
  )
}

function Card({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  )
}

