import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { client } from '../../api/client'

export default function VillageDetail() {
  const { id } = useParams()
  const [village, setVillage] = useState<any>(null)
  const [report, setReport] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])

  useEffect(() => {
    if (!id) return
    Promise.all([
      client.get(`/village/${id}`),
      client.get(`/village/${id}/gap-report`),
      client.get(`/village/${id}/infra`),
    ]).then(([v, r, infra]) => {
      setVillage(v.data)
      setReport(r.data)
      setItems(infra.data.items || [])
    }).catch(() => null)
  }, [id])

  if (!village || !report) return <div className="spinner" />

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">{village.name}</h1>
        <p className="text-sm text-gray-500">{village.district}, {village.state}</p>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <Metric label="Gap score" value={Number(report.gap_score).toFixed(1)} />
          <Metric label="Priority" value={report.priority_rank ?? '—'} />
          <Metric label="SC %" value={`${village.sc_population_pct}%`} />
          <Metric label="Adarsh Gram" value={village.is_adarsh_gram ? 'Yes' : 'No'} />
        </div>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Recommended interventions</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-gray-700">
          {(report.recommended_interventions || []).map((item: string) => <li key={item}>{item}</li>)}
        </ul>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Gap summary</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {(items || []).map((item) => (
            <div key={item.id} className="rounded-lg border border-gray-200 px-4 py-3">
              <div className="text-sm font-medium capitalize">{item.category}</div>
              <div className="text-base font-semibold">{item.item_name}</div>
              <div className="text-sm text-gray-500">{item.status}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-gray-50 p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  )
}
