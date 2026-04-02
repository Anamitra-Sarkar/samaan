import { useEffect, useRef, useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useUIStore } from '../../store/uiStore'
import { client } from '../../api/client'
import { LogOut, User, Bell, PanelLeft, CheckCheck, Clock3 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

type NotificationItem = {
  id: number
  kind: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  link_path?: string | null
  is_read: boolean
  created_at: string
}

export default function Topbar() {
  const { user, logout } = useAuthStore()
  const { sidebarCollapsed, toggleSidebar } = useUIStore()
  const navigate = useNavigate()
  const dropdownRef = useRef<HTMLDivElement | null>(null)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const refreshNotifications = async () => {
    const { data } = await client.get('/notifications')
    setNotifications(data.items || [])
    setUnreadCount(data.unread_count || 0)
  }

  useEffect(() => {
    refreshNotifications()
    const interval = window.setInterval(() => {
      refreshNotifications().catch((error) => {
        console.error('Failed to refresh notifications', error)
      })
    }, 30000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const markAsRead = async (notificationId: number) => {
    await client.patch(`/notifications/${notificationId}/read`)
    await refreshNotifications()
  }

  const markAllAsRead = async () => {
    await client.post('/notifications/read-all')
    await refreshNotifications()
  }

  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => toggleSidebar()}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50 hover:text-[#01696f] transition-colors"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <PanelLeft className={`h-5 w-5 transition-transform duration-300 ${sidebarCollapsed ? 'rotate-180' : ''}`} />
        </button>
        <h2 className="text-lg font-semibold text-gray-800 hidden md:block truncate">
          Ministry of Social Justice & Empowerment
        </h2>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((value) => !value)}
            className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Notifications"
            title="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
            )}
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-3 w-[22rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div>
                  <p className="font-semibold text-gray-900">Notifications</p>
                  <p className="text-xs text-gray-500">Private updates for your account</p>
                </div>
                <button
                  onClick={() => {
                    markAllAsRead().catch((error) => console.error('Failed to mark notifications read', error))
                  }}
                  className="text-xs font-medium text-[#01696f] hover:text-[#014f53] inline-flex items-center gap-1"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-gray-500">
                    No notifications yet.
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => {
                        markAsRead(notification.id).catch((error) => console.error('Failed to mark notification read', error))
                        setDropdownOpen(false)
                        if (notification.link_path) {
                          navigate(notification.link_path)
                        }
                      }}
                      className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${notification.is_read ? 'bg-white' : 'bg-teal-50/40'}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 h-9 w-9 rounded-full flex items-center justify-center ${notification.kind === 'success' ? 'bg-green-100 text-green-600' : notification.kind === 'warning' ? 'bg-orange-100 text-orange-600' : notification.kind === 'error' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                          <Clock3 className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-gray-900 truncate">{notification.title}</p>
                            {!notification.is_read && <span className="h-2 w-2 rounded-full bg-[#01696f] shrink-0" />}
                          </div>
                          <p className="mt-1 text-sm text-gray-600 break-words">{notification.message}</p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

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
