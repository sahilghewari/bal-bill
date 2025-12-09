import React from 'react'
import { ChevronRight } from 'lucide-react'

const Header = ({
  title,
  description,
  breadcrumbs = [],
  action,
  stats,
}) => {
  return (
    <div className="mb-8">
      {breadcrumbs.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <ChevronRight size={16} />}
              <span className={idx === breadcrumbs.length - 1 ? 'text-gray-900 font-medium' : ''}>
                {crumb}
              </span>
            </React.Fragment>
          ))}
        </div>
      )}

      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          {description && (
            <p className="text-gray-600 mt-2">{description}</p>
          )}
        </div>
        {action && <div className="ml-6">{action}</div>}
      </div>

      {stats && stats.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {stats.map((stat, idx) => (
            <div key={idx} className="bg-white rounded-lg p-4 border border-gray-200">
              <p className="text-xs font-medium text-gray-600 uppercase">{stat.label}</p>
              <div className="text-2xl font-bold text-gray-900 mt-2">
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Header
