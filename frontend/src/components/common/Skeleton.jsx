import React from 'react'

/**
 * Skeleton Loading Component
 */
const Skeleton = ({
  width = 'w-full',
  height = 'h-4',
  circle = false,
  count = 1,
  className = '',
}) => {
  const skeletons = Array.from({ length: count })
  const baseClasses = 'bg-gray-200 animate-pulse'
  const circleClass = circle ? 'rounded-full' : 'rounded'

  return (
    <div className="space-y-2">
      {skeletons.map((_, idx) => (
        <div
          key={idx}
          className={`${baseClasses} ${circleClass} ${width} ${height} ${className}`.trim()}
        />
      ))}
    </div>
  )
}

export default Skeleton
