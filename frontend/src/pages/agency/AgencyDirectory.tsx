import { useEffect, useState } from 'react'
import { client } from '../../api/client'
import DataTable from '../../components/shared/DataTable'

export default function AgencyDirectory() {
  const [items, setItems] = useState<any[]>([])

  useEffect(() => {
    client.get('/agency/list').then((res) => setItems(res.data.items || [])).catch(() => setItems([]))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Agency directory</h1>
        <p className="text-sm text-gray-500">Searchable agency list for PM-AJAY coordination.</p>
      </div>
      <DataTable
        data={items}
        rowKey={(row) => row.id}
        columns={[
          { key: 'name', label: 'Agency', render: (row) => row.name },
          { key: 'type', label: 'Type', render: (row) => row.type },
          { key: 'state', label: 'State', render: (row) => row.state },
          { key: 'contact_email', label: 'Email', render: (row) => row.contact_email },
        ]}
      />
    </div>
  )
}

