import React, { useMemo, useState } from 'react'
import { CardElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { Alert, Button, Input } from '../common'
import apiClient from '../../services/api'
import { handlePaymentError } from '../../services/stripeHelper'

/**
 * Stripe Card Payment Component
 */
const StripeCardPayment = ({
  amount = 0,
  currency = 'USD',
  invoiceId,
  onSuccess,
  onError,
  loading: parentLoading = false,
}) => {
  const stripe = useStripe()
  const elements = useElements()
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [cardComplete, setCardComplete] = useState(false)
  const [billingDetails, setBillingDetails] = useState({
    name: '',
    email: '',
  })

  const displayAmount = useMemo(() => Number(amount) || 0, [amount])

  const handleCardChange = (event) => {
    if (event.error) {
      setError(event.error.message)
    } else {
      setError(null)
    }
    setCardComplete(event.complete)
  }

  const handleBillingChange = (e) => {
    const { name, value } = e.target
    setBillingDetails((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!stripe || !elements) {
      setError('Stripe is not loaded yet. Please try again in a few seconds.')
      return
    }

    if (!billingDetails.name || !billingDetails.email) {
      setError('Please complete the billing details before continuing.')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const cardElement = elements.getElement(CardElement)
      if (!cardElement) {
        throw new Error('Unable to find card details field')
      }

      const { error: createError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          name: billingDetails.name,
          email: billingDetails.email,
        },
      })

      if (createError) {
        setError(createError.message)
        onError?.(createError)
        return
      }

      const response = await apiClient.post('/stripe/confirm-payment', {
        invoice_id: invoiceId,
        payment_method_id: paymentMethod.id,
        amount: Math.round(displayAmount * 100),
        currency: currency.toLowerCase(),
      })

      const result = response.data

      if (result?.error) {
        setError(result.error)
        onError?.(result.error)
        return
      }

      if (result?.requires_action) {
        const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(result.client_secret)

        if (confirmError) {
          const message = handlePaymentError(confirmError)
          setError(message)
          onError?.(confirmError)
          return
        }

        if (paymentIntent?.status === 'succeeded') {
          onSuccess?.(paymentIntent)
        }
      } else if (result?.success) {
        onSuccess?.(result)
      }
    } catch (err) {
      const message = handlePaymentError(err)
      setError(message)
      onError?.(err)
    } finally {
      setLoading(false)
    }
  }

  const isLoading = loading || parentLoading

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert
          type="error"
          title="Payment Error"
          message={error}
          dismissible={false}
        />
      )}

      <div className="bg-gray-50 p-4 rounded-lg">
        <p className="text-sm text-gray-600">Amount to Pay</p>
        <p className="text-2xl font-bold text-primary mt-1">
          {currency} {displayAmount.toFixed(2)}
        </p>
      </div>

      <div className="space-y-3">
        <Input
          label="Cardholder Name"
          name="name"
          value={billingDetails.name}
          onChange={handleBillingChange}
          placeholder="John Doe"
          required
          disabled={isLoading}
        />

        <Input
          label="Email"
          type="email"
          name="email"
          value={billingDetails.email}
          onChange={handleBillingChange}
          placeholder="john@example.com"
          required
          disabled={isLoading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Card Details
        </label>
        <div className="border border-gray-300 rounded-lg p-4 bg-white">
          <CardElement
            onChange={handleCardChange}
            options={{
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
            }}
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
        <p className="font-semibold mb-1">🔒 Secure Payment</p>
        <p>Your payment information is encrypted and processed securely by Stripe.</p>
      </div>

      <Button
        type="submit"
        fullWidth
        loading={isLoading}
        disabled={isLoading || !cardComplete}
      >
        Pay {currency} {displayAmount.toFixed(2)}
      </Button>

      <p className="text-xs text-gray-500 text-center">
        By clicking "Pay", you agree to our Terms of Service and authorize this payment.
      </p>
    </form>
  )
}

export default StripeCardPayment
