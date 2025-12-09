import React from 'react'
import Sidebar from './Sidebar'
import TopNav from './TopNav'
import ToastContainer from '../common/ToastContainer'
import { useAppContext } from '../../hooks/useAppContext'

const MainLayout = ({ children }) => {
  const { sidebarOpen, notifications, removeNotification } = useAppContext()

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      <div
        className={`
          flex-1 flex flex-col overflow-hidden
          ${sidebarOpen ? 'ml-64' : 'ml-20'}
          transition-all duration-300
        `.trim()}
      >
        <TopNav />

        <div className="flex-1 overflow-auto">
          <div className="p-6">{children}</div>
        </div>
      </div>

      <ToastContainer notifications={notifications} onRemove={removeNotification} />
    </div>
  )
}

export default MainLayout
