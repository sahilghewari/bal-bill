import React from 'react'

/**
 * Reusable Button Component
 * Variants: primary, secondary, outline, danger
 * Sizes: sm, md, lg
 */
const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  type = 'button',
  onClick,
  className = '',
  icon: Icon,
  iconPosition = 'left',
  ...props
}) => {
  const baseClasses = 'font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2'

  const variantClasses = {
    primary: 'bg-primary text-black shadow-md shadow-primary/40 hover:bg-primary/90 focus:ring-primary',
    secondary: 'bg-gray-200 text-gray-900 shadow-sm hover:bg-gray-300 focus:ring-gray-400',
    outline: 'border-2 border-primary text-primary hover:bg-primary/5 focus:ring-primary',
    danger: 'bg-danger text-black shadow-md shadow-danger/30 hover:bg-danger/90 focus:ring-danger',
    ghost: 'text-primary hover:bg-primary/10 focus:ring-primary',
  }

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  }

  const widthClass = fullWidth ? 'w-full' : ''

  const buttonClasses = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${widthClass}
    ${className}
  `.trim()

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={buttonClasses}
      {...props}
    >
      {Icon && iconPosition === 'left' && <Icon size={20} />}
      {loading ? (
        <>
          <span className="inline-block animate-spin">⟳</span>
          {children}
        </>
      ) : (
        children
      )}
      {Icon && iconPosition === 'right' && <Icon size={20} />}
    </button>
  )
}

export default Button
