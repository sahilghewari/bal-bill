import React, { useMemo } from 'react'
import { Elements } from '@stripe/react-stripe-js'
import { getStripe } from '../../services/stripeHelper'

/**
 * Stripe Provider Component
 */
const StripeProvider = ({ children, amount = 0, currency = 'USD' }) => {
  const stripePromise = useMemo(() => getStripe(), [])

  const options = {
    mode: 'payment',
    amount: Math.max(Math.round(Number(amount || 0) * 100), 0),
    currency: (currency || 'USD').toLowerCase(),
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#208080',
      },
    },
  }

  return (
    <Elements stripe={stripePromise} options={options}>
      {children}
    </Elements>
  )
}

export default StripeProvider
