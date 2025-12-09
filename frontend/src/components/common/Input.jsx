import React, { forwardRef } from 'react'

/**
 * Reusable Input Component with validation states
 */
const Input = forwardRef(({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  touched,
  disabled = false,
  required = false,
  helperText,
  icon: Icon,
  className = '',
  as = 'input',
  rows = 4,
  ...props
}, ref) => {
  const hasError = error && touched
  const Component = as === 'textarea' ? 'textarea' : 'input'

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-900 mb-2">
          {label}
          {required && <span className="text-danger ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <Icon size={18} />
          </div>
        )}

        <Component
          ref={ref}
          type={Component === 'input' ? type : undefined}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          className={`
            w-full px-4 py-2 text-base border rounded-lg
            transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-offset-0
            disabled:bg-gray-100 disabled:cursor-not-allowed
            ${Icon ? 'pl-10' : ''}
            ${Component === 'textarea' ? 'min-h-[120px] resize-y' : ''}
            ${hasError
              ? 'border-danger focus:ring-danger/30'
              : 'border-gray-300 focus:ring-primary/30 focus:border-primary'}
            ${className}
          `.trim()}
          rows={Component === 'textarea' ? rows : undefined}
          {...props}
        />
      </div>

      {hasError && (
        <p className="text-sm text-danger mt-1">{error}</p>
      )}

      {helperText && !hasError && (
        <p className="text-sm text-gray-500 mt-1">{helperText}</p>
      )}
    </div>
  )
})

Input.displayName = 'Input'

export default Input
