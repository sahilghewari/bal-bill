import React, { useMemo } from 'react'
import { useForm } from '../../hooks/useApi'
import { Input, Select, Button, Alert } from '../common'

/**
 * Customer Form Component for create/edit
 */
const CustomerForm = ({
  initialData = null,
  onSubmit,
  loading = false,
  error = null,
}) => {
  const initialValues = useMemo(() => ({
    name: initialData?.name || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    country: initialData?.country || 'USA',
    currency: initialData?.currency || 'USD',
    billing_day: initialData?.billing_day ?? 1,
  }), [initialData])

  const {
    values,
    errors,
    touched,
    loading: formLoading,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
  } = useForm(initialValues, onSubmit, { enableReinitialize: true })

  const countries = [
    { value: 'USA', label: 'United States' },
    { value: 'Canada', label: 'Canada' },
    { value: 'India', label: 'India' },
    { value: 'Philippines', label: 'Philippines' },
  ]

  const currencies = [
    { value: 'USD', label: 'US Dollar (USD)' },
    { value: 'CAD', label: 'Canadian Dollar (CAD)' },
    { value: 'PHP', label: 'Philippine Peso (PHP)' },
  ]

  const billingDays = Array.from({ length: 28 }, (_, i) => ({
    value: i + 1,
    label: `Day ${i + 1}`,
  }))

  const isSubmitting = formLoading || loading
  const handleBillingDayChange = (event) => {
    const value = Number(event.target.value)
    setFieldValue('billing_day', value)
  }

  const handleCancel = () => {
    if (typeof window !== 'undefined') {
      window.history.back()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {(error || errors.general) && (
        <Alert
          type="error"
          title="Error"
          message={error || errors.general}
          dismissible={false}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          label="Customer Name"
          name="name"
          value={values.name}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.name}
          touched={touched.name}
          placeholder="Enter customer name"
          required
        />

        <Input
          label="Email Address"
          name="email"
          type="email"
          value={values.email}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.email}
          touched={touched.email}
          placeholder="Enter email address"
          required
        />

        <Input
          label="Phone Number"
          name="phone"
          type="tel"
          value={values.phone}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.phone}
          touched={touched.phone}
          placeholder="+1-555-0000"
        />

        <Select
          label="Country"
          name="country"
          options={countries}
          value={values.country}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.country}
          touched={touched.country}
          required
        />

        <Select
          label="Currency"
          name="currency"
          options={currencies}
          value={values.currency}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.currency}
          touched={touched.currency}
          required
        />

        <Select
          label="Billing Day (of Month)"
          name="billing_day"
          options={billingDays}
          value={values.billing_day}
          onChange={handleBillingDayChange}
          onBlur={handleBlur}
          error={errors.billing_day}
          touched={touched.billing_day}
        />
      </div>

      <div className="flex gap-3 justify-end">
        <Button
          variant="outline"
          type="button"
          onClick={handleCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          loading={isSubmitting}
          disabled={isSubmitting}
        >
          {initialData ? 'Update Customer' : 'Create Customer'}
        </Button>
      </div>
    </form>
  )
}

export default CustomerForm
