import React, { useState } from 'react'

/**
 * Tabs Component
 */
const Tabs = ({ tabs = [] }) => {
  const [activeTab, setActiveTab] = useState(0)

  const handleTabChange = (index) => {
    setActiveTab(index)
  }

  const activeContent = tabs[activeTab]?.content

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="flex border-b border-gray-200 bg-gray-50">
        {tabs.map((tab, idx) => {
          const Icon = tab.icon
          const active = activeTab === idx

          return (
            <button
              key={`${tab.label}-${idx}`}
              type="button"
              onClick={() => handleTabChange(idx)}
              className={`
                flex items-center gap-2 px-6 py-4 font-medium text-sm
                border-b-2 transition-colors
                ${active
                  ? 'border-primary text-primary bg-white'
                  : 'border-transparent text-gray-600 hover:text-gray-900'}
              `.trim()}
            >
              {Icon && <Icon size={18} />}
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      <div className="p-6">
        {activeContent}
      </div>
    </div>
  )
}

export default Tabs
