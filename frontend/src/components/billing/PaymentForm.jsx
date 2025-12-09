import React, { useState } from 'react'
import { useForm } from '../../hooks/useApi'
import { Input, Select, Button, Alert } from '../common'

/**
 * Payment Form Component
 */
const PaymentForm = ({
  invoiceId,
  invoiceAmount,
  currency = 'USD',
  onSubmit,
  onClose,
}) => {
  const [error, setError] = useState(null)

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
      paid_amount: invoiceAmount,
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'credit_card',
      notes: '',
    },
    async (vals) => {
      try {
        await onSubmit({
          invoice_id: invoiceId,
          paid_amount: parseFloat(vals.paid_amount),
          payment_date: vals.payment_date,
          payment_method: vals.payment_method,
          notes: vals.notes,
        })
      } catch (err) {
        setError(err?.error || 'Failed to record payment')
        throw err
      }
    }
  )

  const paymentMethods = [
    { value: 'credit_card', label: 'Credit Card' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'check', label: 'Check' },
    { value: 'other', label: 'Other' },
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert type="error" title="Error" message={error} dismissible={false} />
      )}

      <div>
        <p className="text-sm text-gray-600">Invoice Amount</p>
        <p className="text-2xl font-bold text-primary mt-1">
          {currency} {Number(invoiceAmount).toFixed(2)}
        </p>
      </div>

      <Input
        label="Amount Paid"
        type="number"
        name="paid_amount"
        value={values.paid_amount}
        onChange={handleChange}
        onBlur={handleBlur}
        error={errors.paid_amount}
        touched={touched.paid_amount}
        step="0.01"
        min="0"
        required
      />

      <Input
        label="Payment Date"
        type="date"
        name="payment_date"
        value={values.payment_date}
        onChange={handleChange}
        onBlur={handleBlur}
        error={errors.payment_date}
        touched={touched.payment_date}
        required
      />

      <Select
        label="Payment Method"
        name="payment_method"
        options={paymentMethods}
        value={values.payment_method}
        onChange={handleChange}
        onBlur={handleBlur}
        error={errors.payment_method}
        touched={touched.payment_method}
      />

      <Input
        label="Notes"
        name="notes"
        value={values.notes}
        onChange={handleChange}
        placeholder="Add any additional notes..."
        as="textarea"
      />

      <div className="flex gap-3 justify-end pt-4">
        <Button variant="outline" type="button" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" loading={loading} disabled={loading}>
          Record Payment
        </Button>
      </div>
    </form>
  )
}

export default PaymentForm
