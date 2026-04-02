import { useEffect, useMemo, useState } from 'react'
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { client } from '../../api/client'
import ScoreBadge from '../../components/shared/ScoreBadge'
import { usePageTitle } from '../../hooks/usePageTitle'

type ScoreRow = {
  id: number
  beneficiary_id: number
  composite_score: number
  repayment_sub_score: number
  income_sub_score: number
  risk_band: string
  score_explanation?: Record<string, unknown> | null
  scored_at: string
}

type Dashboard = {
  total_beneficiaries: number
  average_score: number
  risk_band_distribution: Record<string, number>
  pending_applications: number
  approved_applications: number
}

const BAND_LABELS: Record<string, string> = {
  LOW_RISK_HIGH_NEED: 'Low Risk / High Need',
  LOW_RISK_LOW_NEED: 'Low Risk / Low Need',
  HIGH_RISK_HIGH_NEED: 'High Risk / High Need',
  HIGH_RISK_LOW_NEED: 'High Risk / Low Need',
}

const COLORS = ['#059669', '#2563eb', '#dc2626', '#d97706']

export default function CreditScoreView() {
  usePageTitle('Beneficiary Credit Scores')
  const [rows, setRows] = useState<ScoreRow[]>([])
  const [band, setBand] = useState('')
  const [stats, setStats] = useState<Dashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const [list, dashboard] = await Promise.all([
          client.get('/credit/beneficiaries', { params: band ? { risk_band: band } : undefined }),
          client.get('/credit/dashboard'),
        ])
        if (!active) return
        setRows(list.data.items || [])
        setStats(dashboard.data)
      } catch (e: any) {
        if (!active) return
        setError(e.response?.data?.detail || 'Failed to load credit scores.')
        setRows([])
      } finally {
        if (active) setLoading(false)
      }
    }
    run()
    return () => {
      active = false
    }
  }, [band])

  const pieData = useMemo(() => {
    if (!stats) return []
    return Object.entries(stats.risk_band_distribution).map(([key, value]) => ({
      name: BAND_LABELS[key] || key,
      value,
    }))
  }, [stats])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Beneficiary credit scores</h1>
          <p className="text-sm text-gray-500">Review score trends, risk bands, and SHAP explanations.</p>
        </div>
        <select
          value={band}
          onChange={(e) => setBand(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2"
        >
          <option value="">All risk bands</option>
          {Object.keys(BAND_LABELS).map((value) => (
            <option key={value} value={value}>
              {BAND_LABELS[value]}
            </option>
          ))}
        </select>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="animate-pulse rounded-xl bg-white p-4 shadow-sm">
              <div className="h-4 w-1/2 rounded bg-gray-200" />
              <div className="mt-3 h-8 w-3/4 rounded bg-gray-200" />
              <div className="mt-3 h-24 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {stats && (
            <div className="grid gap-4 md:grid-cols-4">
              <StatCard label="Total beneficiaries" value={stats.total_beneficiaries} />
              <StatCard label="Average score" value={stats.average_score} />
              <StatCard label="Pending applications" value={stats.pending_applications} />
              <StatCard label="Approved applications" value={stats.approved_applications} />
            </div>
          )}

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold">Scored beneficiaries</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="border-b border-gray-200 text-left text-gray-600">
                    <tr>
                      <th className="px-3 py-3">Beneficiary</th>
                      <th className="px-3 py-3">Score</th>
                      <th className="px-3 py-3">Risk band</th>
                      <th className="px-3 py-3">Top SHAP features</th>
                      <th className="px-3 py-3">Scored at</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rows.map((row) => (
                      <tr key={row.id}>
                        <td className="px-3 py-3 font-medium">#{row.beneficiary_id}</td>
                        <td className="px-3 py-3">{row.composite_score.toFixed(1)}</td>
                        <td className="px-3 py-3">
                          <ScoreBadge band={row.risk_band} />
                        </td>
                        <td className="px-3 py-3">
                          <ShapList explanation={row.score_explanation} />
                        </td>
                        <td className="px-3 py-3 text-gray-600">{new Date(row.scored_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-xl bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold">Risk band distribution</h2>
                <div className="h-72">
                  {pieData.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={4}>
                          {pieData.map((entry, index) => (
                            <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-lg bg-gray-50 text-sm text-gray-500">
                      No distribution data available.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function ShapList({ explanation }: { explanation?: Record<string, unknown> | null }) {
  const entries = normalizeExplanation(explanation).slice(0, 3)
  if (!entries.length) return <span className="text-gray-400">No explanation available</span>
  return (
    <ul className="space-y-1">
      {entries.map(([feature, value]) => (
        <li key={feature} className="text-gray-700">
          <span className="font-medium">{feature}</span> <span className={value >= 0 ? 'text-green-700' : 'text-red-700'}>{value >= 0 ? '+' : ''}{value.toFixed(2)}</span>
        </li>
      ))}
    </ul>
  )
}

function normalizeExplanation(explanation?: Record<string, unknown> | null) {
  if (!explanation) return [] as Array<[string, number]>

  const direct = (explanation.top_features || explanation.shap_values || explanation.features) as unknown
  if (Array.isArray(direct)) {
    const pairs = direct
      .map((item: any) => {
        if (Array.isArray(item) && item.length >= 2) return [String(item[0]), Number(item[1])] as [string, number]
        if (item && typeof item === 'object') {
          const feature = String(item.feature ?? item.name ?? item.label ?? 'feature')
          const value = Number(item.value ?? item.shap_value ?? item.weight ?? 0)
          return [feature, value] as [string, number]
        }
        return null
      })
      .filter(Boolean) as Array<[string, number]>
    return pairs.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
  }

  return Object.entries(explanation)
    .map(([key, value]) => [key, Number(value)] as [string, number])
    .filter(([, value]) => Number.isFinite(value))
    .filter(([key]) => !['composite_score', 'risk_band', 'repayment_score', 'income_score', 'summary'].includes(key))
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  )
}

function Alert({ tone, children }: { tone: 'error' | 'success'; children: string }) {
  const className =
    tone === 'error'
      ? 'border-red-200 bg-red-50 text-red-700'
      : 'border-green-200 bg-green-50 text-green-700'
  return <div className={`rounded-lg border px-4 py-3 text-sm ${className}`}>{children}</div>
}
