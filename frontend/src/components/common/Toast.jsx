import React, { useEffect } from 'react'
import Alert from './Alert'

/**
 * Notification Toast Component
 */
const Toast = ({ notification, onClose, autoClose = true, duration = 5000 }) => {
  useEffect(() => {
    if (autoClose && notification.type !== 'error') {
      const timer = setTimeout(() => {
        onClose(notification.id)
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [notification, autoClose, duration, onClose])

  return (
    <div className="animate-slide-up">
      <Alert
        type={notification.type}
        title={notification.title}
        message={notification.message}
        onClose={() => onClose(notification.id)}
        dismissible
      />
    </div>
  )
}

export default Toast
