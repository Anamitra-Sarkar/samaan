import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { client } from '../../api/client'
import MapView from '../../components/shared/MapView'
import { usePageTitle } from '../../hooks/usePageTitle'

type VillagePoint = {
  id: number
  name: string
  state: string
  lat?: number | null
  lng?: number | null
  gap_score: number
  risk_color: string
}

type VillageListRow = {
  id: number
  rank: number
  name: string
  state: string
  district: string
  sc_population_pct: number
  gap_score: number
  is_adarsh_gram: boolean
}

type VillageListResponseItem = {
  village: {
    id: number
    name: string
    state: string
    district: string
    is_adarsh_gram: boolean
    sc_population_pct: number
  }
  gap_report: {
    gap_score: number
    priority_rank?: number | null
  }
}

export default function VillageMap() {
  usePageTitle('Village Gap Map')
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({ total_villages: 0, average_gap_score: 0, adarsh_gram_percentage: 0 })
  const [points, setPoints] = useState<VillagePoint[]>([])
  const [rows, setRows] = useState<VillageListRow[]>([])
  const [sortAsc, setSortAsc] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const [statsRes, mapRes, listRes] = await Promise.all([
          client.get('/village/stats'),
          client.get('/village/map-data'),
          client.get('/village/list', { params: { limit: 100 } }),
        ])
        setStats(statsRes.data)
        setPoints(mapRes.data || [])
        const items = (listRes.data.items || []).map((entry: VillageListResponseItem, index: number) => ({
          id: entry.village.id,
          rank: entry.gap_report.priority_rank ?? index + 1,
          name: entry.village.name,
          state: entry.village.state,
          district: entry.village.district,
          sc_population_pct: entry.village.sc_population_pct,
          gap_score: Number(entry.gap_report.gap_score ?? 0),
          is_adarsh_gram: Boolean(entry.village.is_adarsh_gram),
        })) as VillageListRow[]
        setRows(items)
      } catch (e: any) {
        setError(e.response?.data?.detail || 'Failed to load village map')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => (sortAsc ? a.gap_score - b.gap_score : b.gap_score - a.gap_score))
  }, [rows, sortAsc])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Village gap map</h1>
        <p className="text-sm text-gray-500">View infrastructure gaps, Adarsh Gram status, and ranked villages.</p>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="space-y-4">
          <SkeletonBar />
          <SkeletonMap />
          <SkeletonTable />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard label="Total villages" value={stats.total_villages} />
            <StatCard label="Average gap score" value={stats.average_gap_score.toFixed(1)} />
            <StatCard label="% Adarsh Gram" value={`${stats.adarsh_gram_percentage.toFixed(1)}%`} />
          </div>

          <MapView points={points} onSelect={(id) => navigate(`/village/${id}`)} />

          <div className="rounded-xl bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Village list</h2>
                <p className="text-sm text-gray-500">Click any row to open the village detail page.</p>
              </div>
              <button
                type="button"
                onClick={() => setSortAsc((value) => !value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Sort gap score {sortAsc ? 'descending' : 'ascending'}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <Th>Rank</Th>
                    <Th>Village Name</Th>
                    <Th>State</Th>
                    <Th>District</Th>
                    <Th>SC%</Th>
                    <Th>Gap Score</Th>
                    <Th>Adarsh Gram</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {sortedRows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => navigate(`/village/${row.id}`)}
                      className="cursor-pointer hover:bg-gray-50"
                    >
                      <Td>{row.rank ?? '—'}</Td>
                      <Td>{row.name}</Td>
                      <Td>{row.state}</Td>
                      <Td>{row.district}</Td>
                      <Td>{row.sc_population_pct.toFixed(1)}%</Td>
                      <Td>{row.gap_score.toFixed(1)}</Td>
                      <Td>{row.is_adarsh_gram ? 'Yes' : 'No'}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

function SkeletonBar() {
  return <div className="grid gap-4 md:grid-cols-3">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-24 animate-pulse rounded-xl bg-gray-200" />)}</div>
}

function SkeletonMap() {
  return <div className="h-[600px] animate-pulse rounded-xl bg-gray-200" />
}

function SkeletonTable() {
  return <div className="h-80 animate-pulse rounded-xl bg-gray-200" />
}

function Th({ children }: { children: ReactNode }) {
  return <th className="px-4 py-3 text-left font-semibold text-gray-600">{children}</th>
}

function Td({ children }: { children: ReactNode }) {
  return <td className="px-4 py-3 text-gray-700">{children}</td>
}
