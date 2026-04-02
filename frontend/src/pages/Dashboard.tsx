import { useEffect, useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { client } from '../api/client'
import { 
  Users, 
  FileText, 
  TrendingUp, 
  Shield,
  AlertCircle,
  CheckCircle,
  Clock,
  Upload,
  LucideIcon
} from 'lucide-react'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts'

export default function Dashboard() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState({
    totalBeneficiaries: 0,
    activeLoans: 0,
    aiValidationRate: 0,
    pendingReviews: 0,
    activeDBTCases: 0,
    creditScoreDistribution: [],
    monthlySubmissions: [],
    fundUtilization: { allocated: 0, released: 0, utilized: 0 }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [loanStats, creditStats, dbtStats] = await Promise.all([
          client.get('/loan/stats'),
          client.get('/credit/dashboard'),
          client.get('/dbt/dashboard')
        ])
        const agencyFlow = await client.get('/agency/fund-flow')

        setStats({
          totalBeneficiaries: creditStats.data.total_beneficiaries || 0,
          activeLoans: loanStats.data.active_loans || 0,
          aiValidationRate: loanStats.data.ai_approved_percentage || 0,
          pendingReviews: loanStats.data.pending_reviews || 0,
          activeDBTCases: dbtStats.data.total_cases || 0,
          creditScoreDistribution: [
            { name: 'Low Risk High Need', value: creditStats.data.risk_band_distribution?.['LOW_RISK_HIGH_NEED'] || 0, color: '#16a34a' },
            { name: 'Low Risk Low Need', value: creditStats.data.risk_band_distribution?.['LOW_RISK_LOW_NEED'] || 0, color: '#2563eb' },
            { name: 'High Risk High Need', value: creditStats.data.risk_band_distribution?.['HIGH_RISK_HIGH_NEED'] || 0, color: '#dc2626' },
            { name: 'High Risk Low Need', value: creditStats.data.risk_band_distribution?.['HIGH_RISK_LOW_NEED'] || 0, color: '#d97706' },
          ],
          monthlySubmissions: loanStats.data.monthly_submissions || [],
          fundUtilization: agencyFlow.data.totals || { allocated: 0, released: 0, utilized: 0 }
        })
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-4 border-[#01696f] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Welcome back, {user?.name}</p>
        </div>
        <span className="px-3 py-1 bg-[#01696f]/10 text-[#01696f] rounded-full text-sm font-medium capitalize">
          {user?.role.replace('_', ' ')} View
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard 
          title="Total Beneficiaries" 
          value={stats.totalBeneficiaries.toString()}
          icon={Users}
          trend="+12%"
          color="blue"
        />
        <KpiCard 
          title="Active Loans" 
          value={stats.activeLoans.toString()}
          icon={FileText}
          trend="+8%"
          color="green"
        />
        <KpiCard 
          title="AI Validation Rate" 
          value={`${stats.aiValidationRate.toFixed(1)}%`}
          icon={CheckCircle}
          trend="+5%"
          color="teal"
        />
        <KpiCard 
          title="Pending Reviews" 
          value={stats.pendingReviews.toString()}
          icon={Clock}
          trend="-3"
          color="orange"
          alert={stats.pendingReviews > 10}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Monthly Loan Submissions</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.monthlySubmissions}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="submissions" fill="#01696f" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Credit Score Distribution</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.creditScoreDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.creditScoreDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {stats.creditScoreDistribution.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-gray-600">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fund Utilization & DBT Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Fund Utilization (₹ Crores)</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Allocated</span>
                <span className="font-semibold">₹{stats.fundUtilization.allocated.toLocaleString()}</span>
              </div>
                <div className="h-2 bg-gray-200 rounded-full">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: '100%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Released</span>
                  <span className="font-semibold">₹{stats.fundUtilization.released.toLocaleString()}</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full">
                  <div className="h-full bg-[#d19900] rounded-full" style={{ width: `${stats.fundUtilization.allocated ? (stats.fundUtilization.released / stats.fundUtilization.allocated) * 100 : 0}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Utilized</span>
                  <span className="font-semibold">₹{stats.fundUtilization.utilized.toLocaleString()}</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full">
                  <div className="h-full bg-[#01696f] rounded-full" style={{ width: `${stats.fundUtilization.allocated ? (stats.fundUtilization.utilized / stats.fundUtilization.allocated) * 100 : 0}%` }} />
                </div>
              </div>
            </div>
          </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">DBT Case Statistics</h3>
            <Shield className="h-5 w-5 text-[#01696f]" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#f7f6f2] p-4 rounded-lg">
              <p className="text-3xl font-bold text-[#01696f]">{stats.activeDBTCases}</p>
              <p className="text-sm text-gray-600">Total Cases</p>
            </div>
            <div className="bg-[#f7f6f2] p-4 rounded-lg">
              <p className="text-3xl font-bold text-green-600">85%</p>
              <p className="text-sm text-gray-600">Resolution Rate</p>
            </div>
            <div className="bg-[#f7f6f2] p-4 rounded-lg">
              <p className="text-3xl font-bold text-orange-600">12</p>
              <p className="text-sm text-gray-600">Pending Cases</p>
            </div>
            <div className="bg-[#f7f6f2] p-4 rounded-lg">
              <p className="text-3xl font-bold text-red-600">3</p>
              <p className="text-sm text-gray-600">Open Grievances</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
        <div className="space-y-3">
          <ActivityItem 
            icon={Upload}
            title="Loan proof uploaded"
            description="Rajesh Kumar uploaded proof for Loan #1234"
            time="2 hours ago"
            status="success"
          />
          <ActivityItem 
            icon={AlertCircle}
            title="High risk case flagged"
            description="Credit scoring detected high risk beneficiary"
            time="4 hours ago"
            status="warning"
          />
          <ActivityItem 
            icon={CheckCircle}
            title="DBT disbursed"
            description="₹50,000 disbursed to victim case #567"
            time="5 hours ago"
            status="success"
          />
          <ActivityItem 
            icon={FileText}
            title="Gap report generated"
            description="Village gap analysis completed for District X"
            time="1 day ago"
            status="info"
          />
        </div>
      </div>
    </div>
  )
}

function KpiCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  color,
  alert 
}: { 
  title: string
  value: string
  icon: LucideIcon
  trend: string
  color: string
  alert?: boolean
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    teal: 'bg-teal-50 text-teal-600',
    orange: alert ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className={`text-2xl font-bold mt-1 ${alert ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
          <p className="text-xs text-gray-400 mt-1">{trend} from last month</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  )
}

function ActivityItem({ 
  icon: Icon, 
  title, 
  description, 
  time, 
  status 
}: { 
  icon: LucideIcon
  title: string
  description: string
  time: string
  status: 'success' | 'warning' | 'info'
}) {
  const statusColors = {
    success: 'bg-green-100 text-green-600',
    warning: 'bg-orange-100 text-orange-600',
    info: 'bg-blue-100 text-blue-600'
  }

  return (
    <div className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
      <div className={`p-2 rounded-lg ${statusColors[status]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <p className="font-medium text-sm text-gray-900">{title}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <span className="text-xs text-gray-400">{time}</span>
    </div>
  )
}
