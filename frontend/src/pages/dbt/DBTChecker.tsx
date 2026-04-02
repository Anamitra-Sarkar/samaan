import { useEffect, useState } from 'react'
import { client } from '../../api/client'
import DataTable from '../../components/shared/DataTable'
import { Link } from 'react-router-dom'

export default function DBTChecker() {
  const [items, setItems] = useState<any[]>([])

  useEffect(() => {
    client.get('/dbt/victims').then((res) => setItems(res.data.items || [])).catch(() => setItems([]))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Victim registry</h1>
        <p className="text-sm text-gray-500">Registry of PCR/PoA victims with verification status.</p>
      </div>
      <DataTable
        data={items}
        rowKey={(row) => row.id}
        columns={[
          { key: 'name', label: 'Name', render: (row) => <Link className="text-[#01696f] underline" to={`/dbt/case/${row.id}`}>{row.name}</Link> },
          { key: 'state', label: 'State' },
          { key: 'district', label: 'District' },
          { key: 'verification_status', label: 'Verification' },
        ]}
      />
    </div>
  )
}

