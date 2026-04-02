import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { client } from '../../api/client'

export default function DBTCaseDetail() {
  const { id } = useParams()
  const [timeline, setTimeline] = useState<any[]>([])
  const [item, setItem] = useState<any>(null)

  useEffect(() => {
    if (!id) return
    Promise.all([client.get(`/dbt/case/${id}`), client.get(`/dbt/case/${id}/timeline`)]).then(([detail, timeline]) => {
      setItem(detail.data.case)
      setTimeline(timeline.data.timeline || [])
    })
  }, [id])

  if (!item) return <div className="spinner" />

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Case #{item.id}</h1>
        <p className="text-sm text-gray-500">Victim #{item.victim_id} · {item.status}</p>
      </div>
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Timeline</h2>
        <div className="mt-4 space-y-3">
          {timeline.map((entry) => (
            <div key={`${entry.step}-${entry.timestamp}`} className="rounded-lg border border-gray-200 px-4 py-3">
              <div className="font-medium capitalize">{entry.step}</div>
              <div className="text-sm text-gray-500">{new Date(entry.timestamp).toLocaleString()}</div>
              <div className="text-sm">{entry.notes}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
