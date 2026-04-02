import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { client } from '../../api/client'

import { usePageTitle } from '../../hooks/usePageTitle'

type Village = {
  id: number
  name: string
  state: string
  district: string
  block: string
  sc_population_pct: number
  total_population: number
  is_adarsh_gram: boolean
}

type GapReport = {
  id: number
  village_id: number
  gap_score: number
  priority_rank?: number | null
  recommended_interventions?: string[] | null
}

type InfrastructureItem = {
  id: number
  category: string
  item_name: string
  status: string
  notes?: string | null
}

const statusStyles: Record<string, string> = {
  present: 'bg-green-100 text-green-700',
  absent: 'bg-red-100 text-red-700',
  under_construction: 'bg-yellow-100 text-yellow-700',
  degraded: 'bg-orange-100 text-orange-700',
}

export default function VillageDetail() {
  usePageTitle('Village Detail')
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [village, setVillage] = useState<Village | null>(null)
  const [report, setReport] = useState<GapReport | null>(null)
  const [items, setItems] = useState<InfrastructureItem[]>([])
  const [regenerating, setRegenerating] = useState(false)

  const load = async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [villageRes, reportRes, infraRes] = await Promise.all([
        client.get(`/village/${id}`),
        client.get(`/village/${id}/gap-report`),
        client.get(`/village/${id}/infra`),
      ])
      setVillage(villageRes.data)
      setReport(reportRes.data)
      setItems(infraRes.data.items || [])
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to load village detail')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [id])

  const groupedItems = useMemo(() => {
    return items.reduce<Record<string, InfrastructureItem[]>>((acc, item) => {
      acc[item.category] = acc[item.category] || []
      acc[item.category].push(item)
      return acc
    }, {})
  }, [items])

  const regenerateReport = async () => {
    setRegenerating(true)
    try {
      await client.post('/village/generate-reports')
      await load()
    } finally {
      setRegenerating(false)
    }
  }

  if (loading) {
    return <div className="h-64 animate-pulse rounded-xl bg-gray-200" />
  }

  if (error) {
    return <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
  }

  if (!village) {
    return <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">Village not found.</div>
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{village.name}</h1>
            <p className="text-sm text-gray-500">{village.block}, {village.district}, {village.state}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${village.is_adarsh_gram ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
            {village.is_adarsh_gram ? 'Adarsh Gram' : 'Not declared'}
          </span>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <Metric label="SC population %" value={`${village.sc_population_pct.toFixed(1)}%`} />
          <Metric label="Total population" value={village.total_population.toLocaleString()} />
          <Metric label="State" value={village.state} />
          <Metric label="District" value={village.district} />
        </div>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Gap report</h2>
            <p className="text-sm text-gray-500">Priority rank, score, and recommended interventions.</p>
          </div>
          <button onClick={regenerateReport} disabled={regenerating} className="rounded-md border border-[#01696f] px-4 py-2 text-sm font-semibold text-[#01696f] hover:bg-[#01696f]/5 disabled:opacity-50">
            {regenerating ? 'Regenerating...' : 'Regenerate report'}
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Gap score</span>
            <span className="font-semibold text-gray-900">{Number(report?.gap_score ?? 0).toFixed(1)}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-gray-200">
            <div className="h-full rounded-full bg-[#01696f]" style={{ width: `${Math.min(100, Number(report?.gap_score ?? 0))}%` }} />
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-700">Priority rank: {report?.priority_rank ?? '—'}</span>
          </div>
          <ul className="list-disc space-y-2 pl-5 text-sm text-gray-700">
            {(report?.recommended_interventions || []).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Infrastructure checklist</h2>
        <div className="mt-4 space-y-5">
          {Object.entries(groupedItems).map(([category, categoryItems]) => (
            <div key={category}>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">{category}</h3>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {categoryItems.map((item) => (
                  <div key={item.id} className="rounded-lg border border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-gray-900">{item.item_name}</p>
                        {item.notes && <p className="mt-1 text-sm text-gray-500">{item.notes}</p>}
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[item.status] || 'bg-gray-100 text-gray-600'}`}>
                        {item.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
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
      <p className="mt-1 text-xl font-bold text-gray-900">{value}</p>
    </div>
  )
}
