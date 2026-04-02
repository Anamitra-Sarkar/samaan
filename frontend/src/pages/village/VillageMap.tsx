import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { client } from '../../api/client'
import { usePageTitle } from '../../hooks/usePageTitle'

type VillagePoint = {
  id: number
  name: string
  state: string
  district: string
  lat?: number | null
  lng?: number | null
  gap_score: number
  risk_color: string
  sc_population_pct: number
  total_population: number
  is_adarsh_gram: boolean
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
  gap_summary?: Record<string, number> | null
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
    gap_summary?: Record<string, number> | null
  }
}

type MapComponentType = ComponentType<{ points: VillagePoint[]; onSelect?: (id: number) => void }>

export default function VillageMap() {
  usePageTitle('Village Gap Map')
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mapError, setMapError] = useState<string | null>(null)
  const [stats, setStats] = useState({ total_villages: 0, average_gap_score: 0, adarsh_gram_percentage: 0, total_sc_population: 0 })
  const [points, setPoints] = useState<VillagePoint[]>([])
  const [rows, setRows] = useState<VillageListRow[]>([])
  const [sortAsc, setSortAsc] = useState(false)
  const [selectedState, setSelectedState] = useState<string>('')
  const [MapComponent, setMapComponent] = useState<MapComponentType | null>(null)

  useEffect(() => {
    let alive = true
    import('../../components/shared/MapView')
      .then((mod) => {
        if (alive) setMapComponent(() => mod.default)
      })
      .catch((importError) => {
        if (alive) setMapError(importError instanceof Error ? importError.message : 'Map failed to load')
      })
    return () => {
      alive = false
    }
  }, [])

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
          gap_summary: entry.gap_report.gap_summary || null,
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

  const filteredRows = useMemo(() => {
    const scoped = selectedState ? rows.filter((row) => row.state === selectedState) : rows
    return [...scoped].sort((a, b) => (sortAsc ? a.gap_score - b.gap_score : b.gap_score - a.gap_score))
  }, [rows, sortAsc, selectedState])

  const filteredPoints = useMemo(() => {
    return selectedState ? points.filter((point) => point.state === selectedState) : points
  }, [points, selectedState])

  const states = useMemo(() => Array.from(new Set(rows.map((row) => row.state))).sort(), [rows])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Village gap map</h1>
        <p className="text-sm text-gray-500">Explore SC-majority village gaps, drill into rows, and regenerate reports when infrastructure changes.</p>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {loading ? (
        <div className="space-y-4">
          <SkeletonBar />
          <SkeletonMap />
          <SkeletonTable />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard label="Total villages" value={stats.total_villages} />
            <StatCard label="Average gap score" value={stats.average_gap_score.toFixed(1)} />
            <StatCard label="% Adarsh Gram" value={`${stats.adarsh_gram_percentage.toFixed(1)}%`} />
            <StatCard label="SC population" value={stats.total_sc_population.toLocaleString()} />
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Filter villages</h2>
                <p className="text-sm text-gray-500">Filter the map and list by state.</p>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">All states</option>
                  {states.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setSortAsc((value) => !value)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Sort gap score {sortAsc ? 'ascending' : 'descending'}
                </button>
              </div>
            </div>
          </div>

          {MapComponent && filteredPoints.length > 0 ? (
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <MapComponent points={filteredPoints} onSelect={(id) => navigate(`/village/${id}`)} />
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center text-sm text-gray-600 shadow-sm">
              {mapError
                ? `Interactive map unavailable: ${mapError}`
                : 'No village coordinates available yet. Add village records to display the live map.'}
            </div>
          )}

          <div className="rounded-xl bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Village list</h2>
                <p className="text-sm text-gray-500">Click any row to open the village detail page.</p>
              </div>
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
                    <Th>Top gaps</Th>
                    <Th>Adarsh Gram</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredRows.length ? filteredRows.map((row) => (
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
                      <Td>{topGapSummary(row.gap_summary)}</Td>
                      <Td>{row.is_adarsh_gram ? 'Yes' : 'No'}</Td>
                    </tr>
                  )) : (
                    <tr>
                      <Td colSpan={8}>
                        <div className="py-10 text-center text-gray-500">No villages found for the selected filter.</div>
                      </Td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function topGapSummary(gapSummary?: Record<string, number> | null) {
  if (!gapSummary) return '—'
  return Object.entries(gapSummary)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ')
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
  return <div className="grid gap-4 md:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-24 animate-pulse rounded-xl bg-gray-200" />)}</div>
}

function SkeletonMap() {
  return <div className="h-[600px] animate-pulse rounded-xl bg-gray-200" />
}

function SkeletonTable() {
  return <div className="h-80 animate-pulse rounded-xl bg-gray-200" />
}

function Alert({ tone, children }: { tone: 'error' | 'success'; children: string }) {
  const className =
    tone === 'error'
      ? 'border-red-200 bg-red-50 text-red-700'
      : 'border-green-200 bg-green-50 text-green-700'
  return <div className={`rounded-lg border px-4 py-3 text-sm ${className}`}>{children}</div>
}

function Th({ children }: { children: ReactNode }) {
  return <th className="px-4 py-3 text-left font-semibold text-gray-600">{children}</th>
}

function Td({ children, colSpan }: { children: ReactNode; colSpan?: number }) {
  return <td colSpan={colSpan} className="px-4 py-3 text-gray-700">{children}</td>
}
