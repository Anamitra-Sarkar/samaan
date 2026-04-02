import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { useUIStore } from '../../store/uiStore'
import type { CSSProperties } from 'react'

export default function Layout() {
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed)
  const sidebarWidth = sidebarCollapsed ? '5rem' : '15rem'
  const layoutStyle = {
    '--sidebar-width': sidebarWidth,
  } as CSSProperties
  return (
    <div className="min-h-screen bg-[#f7f6f2] overflow-x-hidden" style={layoutStyle}>
      <Sidebar />
      <div className="min-h-screen flex flex-col lg:pl-[var(--sidebar-width)] transition-[padding] duration-300">
        <Topbar />
        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          <div className="content-max-width mx-auto w-full min-w-0">
            <Outlet />
          </div>
        </main>
        <footer className="bg-white border-t py-4 px-6 text-center text-sm text-gray-500">
          <p>SAMAAN - Ministry of Social Justice & Empowerment, Government of India</p>
          <p className="mt-1 text-xs">Data Privacy Notice: This system handles sensitive beneficiary data. Authorized access only.</p>
        </footer>
      </div>
    </div>
  )
}
