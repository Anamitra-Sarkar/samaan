import { NavLink, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { 
  LayoutDashboard, 
  Upload, 
  FileCheck, 
  ClipboardList,
  TrendingUp,
  Wallet,
  Map,
  Building2,
  Users,
  AlertCircle,
  Menu,
  X,
  Landmark,
  Shield
} from 'lucide-react'
import { useState } from 'react'

interface NavItem {
  label: string
  icon: React.ElementType
  path: string
  roles?: string[]
  subItems?: { label: string; path: string; roles?: string[] }[]
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  {
    label: 'Loan Tracking',
    icon: Upload,
    path: '/loan',
    subItems: [
      { label: 'Upload Proof', path: '/loan/upload', roles: ['beneficiary', 'admin'] },
      { label: 'Review Queue', path: '/loan/review', roles: ['state_officer', 'admin'] },
      { label: 'Data Entry', path: '/loan/data-entry', roles: ['state_officer', 'admin'] },
    ]
  },
  {
    label: 'Credit Scoring',
    icon: TrendingUp,
    path: '/credit',
    subItems: [
      { label: 'Credit Scores', path: '/credit/scores' },
      { label: 'Consumption Entry', path: '/credit/consumption', roles: ['beneficiary', 'admin'] },
      { label: 'Direct Lending', path: '/credit/lending', roles: ['bank_officer', 'admin'] },
    ]
  },
  {
    label: 'Village Gaps',
    icon: Map,
    path: '/village',
    subItems: [
      { label: 'Village Map', path: '/village/map' },
      { label: 'Gap Reports', path: '/village/list' },
    ]
  },
  {
    label: 'Agency Mapping',
    icon: Landmark,
    path: '/agency',
    subItems: [
      { label: 'Directory', path: '/agency/directory' },
      { label: 'Fund Flow', path: '/agency/fund-flow' },
      { label: 'Mapping', path: '/agency/accountability' },
    ]
  },
  {
    label: 'DBT Tracking',
    icon: Shield,
    path: '/dbt',
    subItems: [
      { label: 'Victims', path: '/dbt/victims' },
      { label: 'Register', path: '/dbt/register' },
      { label: 'Cases', path: '/dbt/cases' },
      { label: 'Grievance', path: '/dbt/grievance' },
    ]
  },
]

export default function Sidebar() {
  const { user } = useAuthStore()
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const [expandedSections, setExpandedSections] = useState<string[]>(['Loan Tracking', 'Credit Scoring', 'Village Gaps', 'Agency Mapping', 'DBT Tracking'])

  const toggleSection = (label: string) => {
    setExpandedSections(prev => 
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    )
  }

  const hasAccess = (item: NavItem | { roles?: string[] }) => {
    if (!item.roles) return true
    if (!user) return false
    return item.roles.includes(user.role) || user.role === 'admin'
  }

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`)
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-[#01696f] text-white p-2 rounded-md shadow-lg"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Sidebar */}
      <aside className={`
        fixed left-0 top-0 h-screen w-[280px] bg-[#01696f] text-white overflow-y-auto z-40
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 border-b border-white/20">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Landmark className="h-8 w-8 text-[#d19900]" />
            SAMAAN
          </h1>
          <p className="text-sm text-white/70 mt-1">Empowering the Marginalized through Transparent Governance</p>
        </div>

        <nav className="p-4">
          {navItems.filter(hasAccess).map((item) => (
            <div key={item.label} className="mb-2">
              {item.subItems ? (
                <div>
                  <button
                    onClick={() => toggleSection(item.label)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                      ${isActive(item.path) ? 'bg-white/20' : 'hover:bg-white/10'}
                    `}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                  {expandedSections.includes(item.label) && (
                    <div className="ml-4 mt-1 space-y-1">
                      {item.subItems.filter(hasAccess).map((subItem) => (
                        <NavLink
                          key={subItem.path}
                          to={subItem.path}
                          onClick={() => setIsOpen(false)}
                          className={({ isActive }) => `
                            flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm
                            ${isActive ? 'bg-[#d19900] text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'}
                          `}
                        >
                          {subItem.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <NavLink
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                    ${isActive ? 'bg-[#d19900] text-white' : 'hover:bg-white/10'}
                  `}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </NavLink>
              )}
            </div>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/20">
          <div className="px-4 py-2">
            <p className="text-xs text-white/50">Authenticated as</p>
            <p className="font-medium capitalize">{user?.role.replace('_', ' ')}</p>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
