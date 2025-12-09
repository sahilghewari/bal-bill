import React from 'react'
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react'

/**
 * Reusable Alert Component
 */
const Alert = ({
  type = 'info',
  title,
  message,
  onClose,
  dismissible = true,
  className = '',
}) => {
  const iconMap = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  }

  const colorMap = {
    success: 'bg-success/10 border-success/30 text-success',
    error: 'bg-danger/10 border-danger/30 text-danger',
    warning: 'bg-warning/10 border-warning/30 text-warning',
    info: 'bg-blue-50 border-blue-300 text-blue-800',
  }

  const Icon = iconMap[type]

  return (
    <div
      className={`border rounded-lg p-4 flex gap-3 items-start ${colorMap[type]} ${className}`.trim()}
      role="alert"
    >
      <Icon size={20} className="flex-shrink-0 mt-0.5" />

      <div className="flex-1">
        {title && <h3 className="font-semibold">{title}</h3>}
        {message && <p className="text-sm mt-1">{message}</p>}
      </div>

      {dismissible && onClose && (
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 focus:outline-none flex-shrink-0"
          aria-label="Close alert"
        >
          <X size={18} />
        </button>
      )}
    </div>
  )
}

export default Alert
