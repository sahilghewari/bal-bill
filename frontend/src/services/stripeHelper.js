import { loadStripe } from '@stripe/stripe-js'

let stripePromise = null

/**
 * Get Stripe instance
 */
export const getStripe = async () => {
  if (!stripePromise) {
    stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
  }
  return stripePromise
}

/**
 * Create card element
 */
export const createCardElement = (stripe, elements, options = {}) => {
  if (!elements) return null
  return elements.create('card', {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#fa755a',
      },
    },
    ...options,
  })
}

/**
 * Handle payment errors
 */
export const handlePaymentError = (error) => {
  if (error?.type === 'card_error' || error?.type === 'validation_error') {
    return error.message
  } else if (error?.type === 'payment_intent.authentication_required') {
    return '3D Secure authentication required. Please complete the verification.'
  }
  return 'An unexpected error occurred during payment processing.'
}

/**
 * Format card details
 */
export const formatCardNumber = (value) => {
  if (!value) return ''
  const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
  const matches = v.match(/\d{4,16}/g)
  const match = (matches && matches[0]) || ''
  const parts = []

  for (let i = 0, len = match.length; i < len; i += 4) {
    parts.push(match.substring(i, i + 4))
  }

  if (parts.length) {
    return parts.join(' ')
  }
  return value
}
