import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function Layout() {
  return (
    <div className="min-h-screen bg-[#f7f6f2] flex">
      <Sidebar />
      <div className="flex-1 flex flex-col ml-0 lg:ml-[280px]">
        <Topbar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="content-max-width mx-auto">
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