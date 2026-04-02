import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { client } from '../../api/client'

type Row = {
  village: {
    id: number
    name: string
    state: string
    district: string
    is_adarsh_gram: boolean
  }
  gap_report: {
    gap_score: number
    priority_rank?: number | null
    gap_summary?: Record<string, number> | null
    recommended_interventions?: string[] | null
  }
}

export default function GapReport() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [stateFilter, setStateFilter] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await client.get('/village/list', { params: { limit: 200 } })
        setRows(res.data.items || [])
      } catch (e: any) {
        setError(e.response?.data?.detail || 'Failed to load gap reports')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const states = useMemo(() => Array.from(new Set(rows.map((row) => row.village.state))).sort(), [rows])

  const filtered = useMemo(() => {
    return [...rows]
      .filter((row) => (stateFilter ? row.village.state === stateFilter : true))
      .sort((a, b) => {
        const ar = a.gap_report.priority_rank ?? 9999
        const br = b.gap_report.priority_rank ?? 9999
        return ar - br || b.gap_report.gap_score - a.gap_report.gap_score
      })
  }, [rows, stateFilter])

  const refreshReports = async () => {
    setRefreshing(true)
    setError(null)
    try {
      await client.post('/village/generate-reports')
      const res = await client.get('/village/list', { params: { limit: 200 } })
      setRows(res.data.items || [])
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to refresh reports')
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Village gap reports</h1>
          <p className="text-sm text-gray-500">Ranked list of all villages with their current infrastructure gaps.</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
            <option value="">All states</option>
            {states.map((state) => <option key={state} value={state}>{state}</option>)}
          </select>
          <button onClick={refreshReports} disabled={refreshing} className="rounded-md bg-[#01696f] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {refreshing ? 'Refreshing...' : 'Refresh reports'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-80 animate-pulse rounded-xl bg-gray-200" />
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <Th>Village</Th>
                <Th>State</Th>
                <Th>Gap score</Th>
                <Th>Top missing categories</Th>
                <Th>Interventions</Th>
                <Th>Detail</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((row) => {
                const topMissing = Object.entries(row.gap_report.gap_summary || {})
                  .filter(([, count]) => Number(count) > 0)
                  .sort((a, b) => Number(b[1]) - Number(a[1]))
                  .slice(0, 3)
                  .map(([key]) => key.replace('_', ' '))
                  .join(', ')
                const interventionCount = row.gap_report.recommended_interventions?.length ?? 0
                return (
                  <tr key={row.village.id} className="hover:bg-gray-50">
                    <Td>{row.village.name}</Td>
                    <Td>{row.village.state}</Td>
                    <Td>{row.gap_report.gap_score.toFixed(1)}</Td>
                    <Td>{topMissing || '—'}</Td>
                    <Td>{interventionCount}</Td>
                    <Td><Link className="font-semibold text-[#01696f] hover:underline" to={`/village/${row.village.id}`}>Open</Link></Td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Th({ children }: { children: ReactNode }) {
  return <th className="px-4 py-3 text-left font-semibold text-gray-600">{children}</th>
}

function Td({ children }: { children: ReactNode }) {
  return <td className="px-4 py-3 text-gray-700">{children}</td>
}
