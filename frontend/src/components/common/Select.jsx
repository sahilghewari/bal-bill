import React, { forwardRef } from 'react'
import { ChevronDown } from 'lucide-react'

/**
 * Reusable Select Component
 */
const Select = forwardRef(({
  label,
  options = [],
  value,
  onChange,
  onBlur,
  error,
  touched,
  disabled = false,
  required = false,
  placeholder = 'Select an option...',
  className = '',
  ...props
}, ref) => {
  const hasError = error && touched

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-900 mb-2">
          {label}
          {required && <span className="text-danger ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        <select
          ref={ref}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          className={`
            w-full px-4 py-2 text-base border rounded-lg appearance-none
            transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-offset-0
            disabled:bg-gray-100 disabled:cursor-not-allowed
            pr-10
            ${hasError
              ? 'border-danger focus:ring-danger/30'
              : 'border-gray-300 focus:ring-primary/30 focus:border-primary'}
            ${className}
          `.trim()}
          {...props}
        >
          <option key="placeholder-option" value="">
            {placeholder}
          </option>
          {options.map((option, index) => {
            const rawValue = option.value ?? option.id ?? option.key ?? option.label ?? index
            const optionValue = typeof rawValue === 'string' ? rawValue : String(rawValue)
            const optionLabel = option.label || option.name || optionValue

            return (
              <option
                key={`${optionValue}-${index}`}
                value={optionValue}
              >
                {optionLabel}
              </option>
            )
          })}
        </select>

        <ChevronDown
          size={18}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400"
        />
      </div>

      {hasError && (
        <p className="text-sm text-danger mt-1">{error}</p>
      )}
    </div>
  )
})

Select.displayName = 'Select'

export default Select
