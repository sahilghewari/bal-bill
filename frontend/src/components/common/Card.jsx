import React from 'react'

/**
 * Reusable Card Component
 */
const Card = ({
  children,
  className = '',
  padding = true,
  border = true,
  shadow = true,
  hover = false,
  onClick,
  ...props
}) => {
  const baseClasses = 'bg-white rounded-lg'
  const paddingClass = padding ? 'p-6' : ''
  const borderClass = border ? 'border border-gray-200' : ''
  const shadowClass = shadow ? 'shadow-sm' : ''
  const hoverClass = hover ? 'hover:shadow-md transition-shadow duration-200 cursor-pointer' : ''

  return (
    <div
      className={`${baseClasses} ${paddingClass} ${borderClass} ${shadowClass} ${hoverClass} ${className}`.trim()}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  )
}

export default Card
