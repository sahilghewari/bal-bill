import React from 'react'
import { AlertCircle } from 'lucide-react'
import Button from './Button'

const EmptyState = ({
  icon: IconComponent,
  title = 'No data found',
  description = 'There is no data to display at the moment.',
  action,
  actionLabel = 'Create',
}) => {
  const Icon = IconComponent || AlertCircle

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="bg-gray-100 p-4 rounded-full mb-4">
        <Icon size={32} className="text-gray-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <p className="text-gray-600 text-center mt-2 max-w-sm">{description}</p>
      {action && (
        <Button onClick={action} variant="primary" className="mt-6">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}

export default EmptyState
