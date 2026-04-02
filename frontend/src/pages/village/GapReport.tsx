import { useEffect, useState } from 'react'
import { client } from '../../api/client'
import DataTable from '../../components/shared/DataTable'
import { Link } from 'react-router-dom'

export default function GapReport() {
  const [items, setItems] = useState<any[]>([])

  useEffect(() => {
    client.get('/village/list').then((res) => setItems(res.data.items || [])).catch(() => setItems([]))
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Village gap reports</h1>
          <p className="text-sm text-gray-500">Sorted village-level reports and priority ranks.</p>
        </div>
        <button onClick={() => client.post('/village/generate-reports')} className="rounded-md bg-[#01696f] px-4 py-2 text-white">
          Refresh reports
        </button>
      </div>
      <DataTable
        data={items}
        rowKey={(row) => row.village.id}
        columns={[
          { key: 'name', label: 'Village', render: (row) => <Link className="text-[#01696f] underline" to={`/village/${row.village.id}`}>{row.village.name}</Link> },
          { key: 'state', label: 'State', render: (row) => row.village.state },
          { key: 'gap_score', label: 'Gap score', render: (row) => row.gap_report.gap_score.toFixed(1) },
          { key: 'priority_rank', label: 'Priority rank', render: (row) => row.gap_report.priority_rank ?? '—' },
          { key: 'is_adarsh_gram', label: 'Adarsh Gram', render: (row) => (row.village.is_adarsh_gram ? 'Yes' : 'No') },
        ]}
      />
    </div>
  )
}

