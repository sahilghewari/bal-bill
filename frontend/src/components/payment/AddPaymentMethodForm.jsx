import React, { useState } from 'react'
import { CardElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { Input, Button, Alert } from '../common'
import { useForm } from '../../hooks/useApi'
import { useAppContext } from '../../hooks/useAppContext'
import stripeService from '../../services/stripeService'

/**
 * Add Payment Method Form
 */
const AddPaymentMethodForm = ({ customerId, onSuccess, onClose }) => {
  const stripe = useStripe()
  const elements = useElements()
  const { addNotification } = useAppContext()
  const [submitError, setSubmitError] = useState(null)

  const {
    values,
    errors,
    touched,
    loading,
    handleChange,
    handleBlur,
    handleSubmit,
  } = useForm(
    {
      card_holder_name: '',
      is_default: false,
    },
    async (vals) => {
      setSubmitError(null)

      if (!customerId) {
        setSubmitError('Customer information is missing. Please close and retry.')
        throw new Error('Missing customerId')
      }

      if (!stripe || !elements) {
        setSubmitError('Stripe is not loaded yet. Please wait a moment and try again.')
        throw new Error('Stripe not ready')
      }

      const cardElement = elements.getElement(CardElement)
      if (!cardElement) {
        setSubmitError('Unable to initialize card details field')
        throw new Error('Missing card element')
      }

      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          name: vals.card_holder_name,
        },
      })

      if (error) {
        setSubmitError(error.message)
        throw {
          details: {
            card_holder_name: error.message,
          },
          message: error.message,
        }
      }

      const savedMethod = await stripeService.savePaymentMethod(
        customerId,
        paymentMethod.id,
        Boolean(vals.is_default)
      )

      addNotification({
        type: 'success',
        title: 'Payment method saved',
        message: 'The card has been added to this account.',
      })

      onSuccess?.(savedMethod || paymentMethod)
      onClose?.()
    }
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {(submitError || errors.general) && (
        <Alert
          type="error"
          title="Unable to save payment method"
          message={submitError || errors.general}
          dismissible={false}
        />
      )}

      <Input
        label="Cardholder Name"
        name="card_holder_name"
        value={values.card_holder_name}
        onChange={handleChange}
        onBlur={handleBlur}
        error={errors.card_holder_name}
        touched={touched.card_holder_name}
        placeholder="John Doe"
        required
        disabled={loading}
      />

      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Card Details
        </label>
        <div className="border border-gray-300 rounded-lg p-4 bg-white">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                },
              },
            }}
            disabled={loading}
          />
        </div>
      </div>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="is_default"
          checked={values.is_default}
          onChange={handleChange}
          className="rounded"
          disabled={loading}
        />
        <span className="text-sm text-gray-700">
          Set as default payment method
        </span>
      </label>

      <div className="flex gap-3 justify-end pt-4">
        <Button variant="outline" type="button" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" loading={loading} disabled={loading}>
          Save Payment Method
        </Button>
      </div>
    </form>
  )
}

export default AddPaymentMethodForm
