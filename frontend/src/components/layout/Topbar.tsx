import { useAuthStore } from '../../store/authStore'
import { LogOut, User, Bell } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Topbar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-gray-800 hidden md:block">
          Ministry of Social Justice & Empowerment
        </h2>
      </div>

      <div className="flex items-center gap-4">
        <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
        </button>

        <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
          <div className="text-right hidden sm:block">
            <p className="font-medium text-sm text-gray-900">{user?.name}</p>
            <p className="text-xs text-gray-500 capitalize">{user?.role.replace('_', ' ')}</p>
          </div>
          <div className="h-10 w-10 bg-[#01696f] rounded-full flex items-center justify-center text-white font-semibold">
            <User className="h-5 w-5" />
          </div>
          <button 
            onClick={handleLogout}
            className="ml-2 p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-md transition-colors"
            title="Logout"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  )
}