import React, { useEffect } from 'react'
import { useForm } from '../../hooks/useApi'
import { Input, Select, Button, Alert, Card } from '../common'

/**
 * Rate Card Form Component
 */
const RateCardForm = ({
  initialData = null,
  customerId,
  onSubmit,
  loading = false,
  error = null,
}) => {
  const {
    values,
    errors,
    touched,
    loading: formLoading,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
  } = useForm(
    initialData || {
      customer_id: customerId,
      service_type: 'DID',
      initial_block_seconds: 60,
      next_block_seconds: 60,
      price_per_minute: '',
      connection_fee_flat: 0,
      effective_date: new Date().toISOString().split('T')[0],
      currency: initialData?.currency || '',
    },
    onSubmit,
    { enableReinitialize: true }
  )

  useEffect(() => {
    if (!initialData && customerId) {
      setFieldValue('customer_id', customerId)
    }
  }, [customerId, initialData, setFieldValue])

  const serviceTypes = [
    { value: 'DID', label: 'DID (Direct Inward Dial)' },
    { value: 'VIRTUAL_NUMBER', label: 'Virtual Number' },
  ]

  const blockOptions = [
    { value: 6, label: '6 seconds' },
    { value: 12, label: '12 seconds' },
    { value: 30, label: '30 seconds' },
    { value: 60, label: '60 seconds (1 minute)' },
  ]

  const currencyOptions = [
    { value: '', label: 'Use customer default' },
    { value: 'USD', label: 'USD — US Dollar' },
    { value: 'EUR', label: 'EUR — Euro' },
    { value: 'GBP', label: 'GBP — British Pound' },
    { value: 'INR', label: 'INR — Indian Rupee' },
    { value: 'CAD', label: 'CAD — Canadian Dollar' },
    { value: 'AUD', label: 'AUD — Australian Dollar' },
  ]

  const initialBlock = Number(values.initial_block_seconds || 0)
  const nextBlock = Number(values.next_block_seconds || 0)
  const connectionFee = Number(values.connection_fee_flat || 0)

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert
          type="error"
          title="Error"
          message={error}
          dismissible={false}
        />
      )}

      {/* Service Type, Currency & Effective Date */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Select
          label="Service Type"
          name="service_type"
          options={serviceTypes}
          value={values.service_type}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.service_type}
          touched={touched.service_type}
          required
          disabled={!!initialData}
        />

        <Select
          label="Currency"
          name="currency"
          options={currencyOptions}
          value={values.currency}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.currency}
          touched={touched.currency}
          helperText="Leave blank to inherit the customer currency"
        />

        <Input
          label="Effective Date"
          name="effective_date"
          type="date"
          value={values.effective_date}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.effective_date}
          touched={touched.effective_date}
          required
        />
      </div>

      {/* Pricing Configuration */}
      <Card className="bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-gray-900 mb-4">Pricing Configuration</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Initial Block */}
          <Select
            label="Initial Block Duration"
            name="initial_block_seconds"
            options={blockOptions}
            value={values.initial_block_seconds}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.initial_block_seconds}
            touched={touched.initial_block_seconds}
            required
          />

          {/* Next Block */}
          <Select
            label="Next Block Duration"
            name="next_block_seconds"
            options={blockOptions}
            value={values.next_block_seconds}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.next_block_seconds}
            touched={touched.next_block_seconds}
            required
          />

          {/* Price per Minute */}
          <Input
            label="Price per Minute"
            name="price_per_minute"
            type="number"
            value={values.price_per_minute}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.price_per_minute}
            touched={touched.price_per_minute}
            placeholder="0.004"
            step="0.0001"
            min="0"
            required
          />

          {/* Connection Fee */}
          <Input
            label="Connection Fee (flat)"
            name="connection_fee_flat"
            type="number"
            value={values.connection_fee_flat}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.connection_fee_flat}
            touched={touched.connection_fee_flat}
            placeholder="0.00"
            step="0.01"
            min="0"
          />
        </div>
      </Card>

      {/* Pricing Example */}
      <Card className="bg-gray-50">
        <h3 className="font-semibold text-gray-900 mb-4">Pricing Example</h3>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Call lasting 30 seconds:</span>
            <span className="font-semibold">
              Charged for {initialBlock || 0}s (initial block)
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-600">Call lasting 65 seconds:</span>
            <span className="font-semibold">
              Charged for {initialBlock + nextBlock || 0}s (initial + 1 next block)
            </span>
          </div>

          <div className="flex justify-between pt-2 border-t border-gray-200">
            <span className="text-gray-600">Connection Fee:</span>
            <span className="font-semibold">${connectionFee.toFixed(4)}</span>
          </div>
        </div>
      </Card>

      {/* Submit Buttons */}
      <div className="flex gap-3 justify-end">
        <Button
          variant="outline"
          type="button"
          onClick={() => window.history.back()}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          loading={formLoading || loading}
          disabled={formLoading || loading}
        >
          {initialData ? 'Update Rate Card' : 'Create Rate Card'}
        </Button>
      </div>
    </form>
  )
}

export default RateCardForm
