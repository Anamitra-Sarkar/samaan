import { useEffect, useState } from 'react'
import { client } from '../../api/client'
import DataTable from '../../components/shared/DataTable'
import { Link } from 'react-router-dom'

export default function DBTSchemes() {
  const [items, setItems] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    Promise.all([client.get('/dbt/cases'), client.get('/dbt/dashboard')]).then(([cases, dashboard]) => {
      setItems(cases.data.items || [])
      setStats(dashboard.data)
    }).catch(() => null)
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">DBT cases</h1>
        <p className="text-sm text-gray-500">Track registrations, sanctioning, and disbursement status.</p>
      </div>
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Metric label="Total cases" value={stats.total_cases} />
          <Metric label="Total disbursed" value={stats.total_disbursed} />
          <Metric label="Pending cases" value={stats.pending_cases} />
          <Metric label="Grievance resolution rate" value={`${stats.grievance_resolution_rate}%`} />
        </div>
      )}
      <DataTable
        data={items}
        rowKey={(row) => row.id}
        columns={[
          { key: 'id', label: 'Case ID', render: (row) => <Link className="text-[#01696f] underline" to={`/dbt/case/${row.id}`}>{row.id}</Link> },
          { key: 'victim_id', label: 'Victim ID' },
          { key: 'assistance_type', label: 'Assistance type' },
          { key: 'status', label: 'Status' },
          { key: 'approved_amount', label: 'Approved amount' },
        ]}
      />
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  )
}
