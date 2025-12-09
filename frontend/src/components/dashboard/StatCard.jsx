import React from 'react'

const StatCard = ({
  title,
  value,
  icon: Icon,
  trend,
  positive = true,
  backgroundColor = 'bg-blue-50',
  iconColor = 'text-blue-600',
}) => {
  const trendColor = positive ? 'text-success' : 'text-danger'

  return (
    <div className={`${backgroundColor} rounded-lg p-6 border border-gray-200`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {trend && (
            <p className={`text-sm font-semibold mt-2 ${trendColor}`}>
              {trend} from last month
            </p>
          )}
        </div>
        {Icon && (
          <div className={`p-3 rounded-lg ${backgroundColor} ${iconColor}`}>
            <Icon size={24} />
          </div>
        )}
      </div>
    </div>
  )
}

export default StatCard
