import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Home,
  Users,
  FileText,
  FilePlus2,
  Settings,
  LogOut,
  ChevronLeft,
  BarChart3,
  Tag,
} from 'lucide-react'
import { useAppContext } from '../../hooks/useAppContext'

/**
 * Sidebar Navigation Component
 */
const Sidebar = () => {
  const { sidebarOpen, toggleSidebar, user, logout } = useAppContext()
  const location = useLocation()

  const menuSections = [
    {
      label: 'Overview',
      items: [
        { icon: Home, label: 'Dashboard', path: '/dashboard' },
        { icon: Users, label: 'Customers', path: '/customers' },
      ],
    },
    {
      label: 'Billing',
      items: [
        { icon: FileText, label: 'Invoices', path: '/invoices' },
        { icon: FilePlus2, label: 'Generate Invoice', path: '/billing/generate-invoice' },
      ],
    },
    {
      label: 'Insights',
      items: [
        { icon: BarChart3, label: 'Analytics', path: '/analytics/revenue' },
        { icon: Tag, label: 'Rate Cards', path: '/rate-cards' },
      ],
    },
    {
      label: 'System',
      items: [
        { icon: Settings, label: 'Settings', path: '/settings' },
      ],
    },
  ]

  const isActive = (path) => location.pathname.startsWith(path)

  return (
    <div
      className={`${
        sidebarOpen ? 'w-64' : 'w-20'
      } bg-slate-900 text-white transition-all duration-300 fixed left-0 top-0 h-screen flex flex-col shadow-lg z-40`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        {sidebarOpen && (
          <h1 className="text-lg font-bold truncate">Telecom</h1>
        )}
        <button
          onClick={toggleSidebar}
          className="p-1 hover:bg-white/10 rounded-lg transition-colors"
          aria-label="Toggle sidebar"
        >
          <ChevronLeft
            size={20}
            className={`transform transition-transform ${
              !sidebarOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-6">
        {menuSections.map((section) => (
          <div key={section.label}>
            {sidebarOpen && (
              <p className="px-5 text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                {section.label}
              </p>
            )}
            <div className="space-y-2 px-2">
              {section.items.map((item) => {
                const Icon = item.icon
                const active = isActive(item.path)

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`
                      flex items-center gap-3 px-3 py-2 rounded-lg transition-colors
                      ${
                        active
                          ? 'bg-white/10 text-white'
                          : 'text-slate-300 hover:bg-white/5'
                      }
                    `.trim()}
                    title={!sidebarOpen ? item.label : ''}
                  >
                    <Icon size={20} className="flex-shrink-0" />
                    {sidebarOpen && (
                      <span className="text-sm font-medium truncate">
                        {item.label}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Info & Logout */}
      <div className="border-t border-white/10 p-4 space-y-3">
        {sidebarOpen && user && (
          <div className="text-sm truncate">
            <p className="text-slate-300">Logged in as</p>
            <p className="font-semibold truncate">{user.name}</p>
          </div>
        )}

        <button
          onClick={logout}
          className={`
            w-full flex items-center gap-3 px-3 py-2 rounded-lg
            text-slate-300 hover:bg-white/10 transition-colors
          `.trim()}
          title={!sidebarOpen ? 'Logout' : ''}
        >
          <LogOut size={20} className="flex-shrink-0" />
          {sidebarOpen && <span className="text-sm font-medium">Logout</span>}
        </button>
      </div>
    </div>
  )
}

export default Sidebar
