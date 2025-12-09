import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Search, User, Settings } from 'lucide-react'
import { useAppContext } from '../../hooks/useAppContext'
import Badge from '../common/Badge'

const TopNav = () => {
  const { user, notifications } = useAppContext()
  const unreadCount = notifications.filter((n) => !n.read).length
  const navigate = useNavigate()

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search customers, invoices..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      <div className="flex items-center gap-6 ml-6">
        <button
          type="button"
          className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Notifications"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <Badge variant="danger" size="sm" className="absolute -top-1 -right-1">
              {unreadCount}
            </Badge>
          )}
        </button>

        <button
          type="button"
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Settings"
          onClick={() => navigate('/settings')}
        >
          <Settings size={20} />
        </button>

        <button
          type="button"
          onClick={() => navigate('/settings')}
          className="flex items-center gap-3 pl-3 border-l border-gray-200 text-left hover:bg-gray-100 rounded-lg py-1 pr-3 transition-colors"
          aria-label="Open user settings"
        >
          <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center">
            <User size={16} />
          </div>
          <div className="text-sm">
            <p className="font-medium text-gray-900">{user?.name || 'User'}</p>
            <p className="text-gray-500 text-xs">{user?.email || 'View profile'}</p>
          </div>
        </button>
      </div>
    </div>
  )
}

export default TopNav
