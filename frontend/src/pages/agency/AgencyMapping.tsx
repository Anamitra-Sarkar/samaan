import { useEffect, useState } from 'react'
import { client } from '../../api/client'
import DataTable from '../../components/shared/DataTable'
import { usePageTitle } from '../../hooks/usePageTitle'

export default function AgencyMapping() {
  usePageTitle('Agency Mapping')
  const [items, setItems] = useState<any[]>([])

  useEffect(() => {
    client.get('/agency/accountability-matrix').then((res) => setItems(res.data)).catch(() => setItems([]))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Accountability matrix</h1>
        <p className="text-sm text-gray-500">Who is responsible for what, by agency and PM-AJAY component.</p>
      </div>
      <DataTable
        data={items}
        rowKey={(row) => `${row.agency}-${row.component}`}
        columns={[
          { key: 'agency', label: 'Agency' },
          { key: 'component', label: 'Component' },
          { key: 'role', label: 'Role' },
          { key: 'status', label: 'Status' },
          { key: 'milestones', label: 'Milestones' },
        ]}
      />
    </div>
  )
}

