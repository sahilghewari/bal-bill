export const formatCurrency = (value, currency = 'USD') => {
  const amount = Number.isFinite(value) ? Number(value) : 0
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount)
}

export const formatDateTime = (value, options = {}) => {
  if (!value) return 'N/A'
  const date = value instanceof Date ? value : new Date(value)

  const defaults = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }

  return new Intl.DateTimeFormat('en-US', { ...defaults, ...options }).format(date)
}

export const sleep = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms))
