import React from 'react'
import Toast from './Toast'

/**
 * Toast Container Component
 */
const ToastContainer = ({ notifications, onRemove }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-md">
      {notifications.map((notification) => (
        <Toast
          key={notification.id}
          notification={notification}
          onClose={onRemove}
        />
      ))}
    </div>
  )
}

export default ToastContainer
