import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import MainLayout from '../../components/layout/MainLayout'
import Header from '../../components/layout/Header'
import {
  Card,
  Input,
  Select,
  Button,
  Alert,
} from '../../components/common'
import { useAppContext, useBillingContext } from '../../hooks/useAppContext'
import { useForm } from '../../hooks/useApi'
import customerService from '../../services/customerService'

const createLineItem = () => ({
  id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  description: '',
  quantity: '1',
  unit_price: '0',
})

const formatDate = (date) => date.toISOString().split('T')[0]

const currencyOptions = [
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'GBP', label: 'GBP — British Pound' },
  { value: 'INR', label: 'INR — Indian Rupee' },
]

const formatCurrency = (value, currency = 'USD') => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—'
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(Number(value))
}

const GenerateInvoicePage = () => {
  const navigate = useNavigate()
  const { addNotification } = useAppContext()
  const { generateInvoice, billingLoading, billingError } = useBillingContext()
  const [customers, setCustomers] = useState([])
  const [customersLoading, setCustomersLoading] = useState(false)
  const [customersError, setCustomersError] = useState(null)
  const [lineItems, setLineItems] = useState([createLineItem()])

  const today = new Date()
  const defaultIssueDate = formatDate(today)
  const defaultDueDate = formatDate(new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000))
  const defaultPeriodStart = formatDate(new Date(today.getFullYear(), today.getMonth(), 1))
  const defaultPeriodEnd = formatDate(today)

  const customerOptions = useMemo(() => customers.map((customer) => ({
    value: customer.id,
    label: customer.account_number
      ? `${customer.name} (${customer.account_number})`
      : `${customer.name} (${customer.email})`,
  })), [customers])

  const sanitizeLineItems = useCallback(() => lineItems
    .filter((item) => item.description?.trim())
    .map((item) => ({
      description: item.description.trim(),
      quantity: Number(item.quantity) || 0,
      unit_price: Number(item.unit_price) || 0,
    })), [lineItems])

  const loadCustomers = useCallback(async () => {
    try {
      setCustomersLoading(true)
      setCustomersError(null)
      const response = await customerService.getAllCustomers(1, 100)
      setCustomers(response.data || [])
    } catch (err) {
      setCustomersError(err?.error || 'Failed to load customers')
    } finally {
      setCustomersLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCustomers()
  }, [loadCustomers])

  const {
    values,
    errors,
    touched,
    loading: formSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
  } = useForm(
    {
      customer_id: '',
      currency: 'USD',
      billing_period_start: defaultPeriodStart,
      billing_period_end: defaultPeriodEnd,
      issue_date: defaultIssueDate,
      due_date: defaultDueDate,
      usage_charges: '',
      tax_rate: '0',
      discount_amount: '0',
      notes: '',
      auto_publish: true,
    },
    async (vals) => {
      if (!vals.customer_id) {
        throw { details: { customer_id: 'Select a customer before generating' } }
      }

      const payload = {
        currency: vals.currency,
        billing_period_start: vals.billing_period_start,
        billing_period_end: vals.billing_period_end,
        issue_date: vals.issue_date,
        due_date: vals.due_date,
        usage_charges: Number(vals.usage_charges) || 0,
        tax_rate: Number(vals.tax_rate) || 0,
        discount_amount: Number(vals.discount_amount) || 0,
        notes: vals.notes,
        auto_publish: Boolean(vals.auto_publish),
        line_items: sanitizeLineItems(),
      }

      const invoice = await generateInvoice(vals.customer_id, payload)
      addNotification({
        type: 'success',
        title: 'Invoice generated',
        message: `Invoice ${invoice.invoice_number || ''} created successfully`,
      })
      navigate(`/invoices/${invoice.id}`)
    }
  )

  const formatValue = useCallback((amount) => formatCurrency(amount, values.currency || 'USD'), [values.currency])

  const invoicePreview = useMemo(() => {
    const lineItemsTotal = lineItems.reduce((sum, item) => {
      const qty = Number(item.quantity) || 0
      const price = Number(item.unit_price) || 0
      return sum + qty * price
    }, 0)
    const usageCharges = Number(values.usage_charges) || 0
    const subtotal = lineItemsTotal + usageCharges
    const taxRate = Number(values.tax_rate) || 0
    const taxAmount = subtotal * (taxRate / 100)
    const discount = Number(values.discount_amount) || 0
    const total = Math.max(subtotal + taxAmount - discount, 0)

    return {
      lineItemsTotal,
      usageCharges,
      subtotal,
      taxAmount,
      discount,
      total,
    }
  }, [lineItems, values.usage_charges, values.tax_rate, values.discount_amount])

  const handleLineItemChange = (id, field, value) => {
    setLineItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  const addLineItem = () => {
    setLineItems((prev) => [...prev, createLineItem()])
  }

  const removeLineItem = (id) => {
    setLineItems((prev) => (prev.length === 1 ? prev : prev.filter((item) => item.id !== id)))
  }

  const submitting = billingLoading || formSubmitting
  const handleReset = useCallback(() => {
    setLineItems([createLineItem()])
    setFieldValue('usage_charges', '')
    setFieldValue('discount_amount', '0')
    setFieldValue('tax_rate', '0')
  }, [setFieldValue])

  return (
    <MainLayout>
      <Header
        title="Generate Invoice"
        description="Create a new invoice, review totals, and publish when ready"
        breadcrumbs={['Billing', 'Generate Invoice']}
        action={
          <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/invoices')}>
            Back to Invoices
          </Button>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <form id="generate-invoice-form" className="xl:col-span-2 space-y-6" onSubmit={handleSubmit}>
          <Card>
            <div className="space-y-6">
              {(errors.general || billingError) && (
                <Alert
                  type="error"
                  title="Submission error"
                  message={errors.general || billingError}
                  dismissible={false}
                />
              )}

              {customersError && (
                <Alert
                  type="warning"
                  title="Customer list unavailable"
                  message={customersError}
                  dismissible={false}
                />
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Customer"
                  name="customer_id"
                  value={values.customer_id}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  options={customerOptions}
                  error={errors.customer_id}
                  touched={touched.customer_id}
                  disabled={customersLoading}
                  required
                />
                <Select
                  label="Currency"
                  name="currency"
                  value={values.currency}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  options={currencyOptions}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Issue Date"
                  type="date"
                  name="issue_date"
                  value={values.issue_date}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                />
                <Input
                  label="Due Date"
                  type="date"
                  name="due_date"
                  value={values.due_date}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Billing Period Start"
                  type="date"
                  name="billing_period_start"
                  value={values.billing_period_start}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                />
                <Input
                  label="Billing Period End"
                  type="date"
                  name="billing_period_end"
                  value={values.billing_period_end}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Usage Charges"
                  type="number"
                  name="usage_charges"
                  value={values.usage_charges}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                />
                <Input
                  label="Tax Rate (%)"
                  type="number"
                  name="tax_rate"
                  value={values.tax_rate}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  step="0.01"
                  min="0"
                />
                <Input
                  label="Discount Amount"
                  type="number"
                  name="discount_amount"
                  value={values.discount_amount}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  step="0.01"
                  min="0"
                />
              </div>

              <Input
                label="Internal Notes"
                name="notes"
                value={values.notes}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Add context for finance or customer success"
                as="textarea"
              />

              <div className="flex items-center gap-3">
                <input
                  id="auto_publish"
                  type="checkbox"
                  checked={Boolean(values.auto_publish)}
                  onChange={(e) => setFieldValue('auto_publish', e.target.checked)}
                  className="h-4 w-4 text-primary border-gray-300 rounded"
                />
                <label htmlFor="auto_publish" className="text-sm text-gray-700">
                  Publish invoice immediately after generation
                </label>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Line Items</h3>
                <p className="text-sm text-gray-500">Add detailed adjustments or manual charges</p>
              </div>
              <Button type="button" variant="outline" icon={Plus} onClick={addLineItem}>
                Add Item
              </Button>
            </div>

            <div className="space-y-4">
              {lineItems.map((item, index) => {
                const lineTotal = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0)
                return (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-700">Item {index + 1}</p>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-xs uppercase text-gray-400 tracking-wide">Line Total</p>
                          <p className="font-semibold text-gray-900">{formatValue(lineTotal)}</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          icon={Trash2}
                          onClick={() => removeLineItem(item.id)}
                          disabled={lineItems.length === 1}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="md:col-span-2">
                        <Input
                          label="Description"
                          name={`description-${item.id}`}
                          value={item.description}
                          onChange={(e) => handleLineItemChange(item.id, 'description', e.target.value)}
                          placeholder="e.g., Premium support package"
                        />
                      </div>
                      <Input
                        label="Quantity"
                        type="number"
                        name={`quantity-${item.id}`}
                        value={item.quantity}
                        onChange={(e) => handleLineItemChange(item.id, 'quantity', e.target.value)}
                        min="0"
                        step="0.01"
                      />
                      <Input
                        label="Unit Price"
                        type="number"
                        name={`unit_price-${item.id}`}
                        value={item.unit_price}
                        onChange={(e) => handleLineItemChange(item.id, 'unit_price', e.target.value)}
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          <div className="flex flex-col gap-3 md:flex-row md:justify-end">
            <Button
              type="submit"
              form="generate-invoice-form"
              loading={submitting}
              disabled={submitting || customersLoading}
            >
              Generate Invoice
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleReset}
              disabled={submitting}
            >
              Reset Values
            </Button>
          </div>
        </form>

        <div className="space-y-6">
          <Card>
            <h3 className="text-lg font-semibold mb-4">Invoice Summary</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Usage Charges</span>
                <span className="font-semibold">{formatValue(invoicePreview.usageCharges)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Line Items</span>
                <span className="font-semibold">{formatValue(invoicePreview.lineItemsTotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold">{formatValue(invoicePreview.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Tax ({values.tax_rate || 0}%)</span>
                <span className="font-semibold">{formatValue(invoicePreview.taxAmount)}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-warning">
                <span>Discounts</span>
                <span>-{formatValue(invoicePreview.discount)}</span>
              </div>
              <div className="flex items-center justify-between text-base font-bold text-gray-900 border-t border-gray-200 pt-3">
                <span>Estimated Total</span>
                <span>{formatValue(invoicePreview.total)}</span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <Button
                type="submit"
                form="generate-invoice-form"
                loading={submitting}
                disabled={submitting || customersLoading}
              >
                Generate Invoice
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleReset}
                disabled={submitting}
              >
                Reset Values
              </Button>
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold mb-3">Submission Checklist</h3>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-2">
              <li>Confirm billing period aligns with rated usage.</li>
              <li>Validate manual line items have descriptions.</li>
              <li>Double-check tax and discount inputs.</li>
              <li>Disable auto publish if finance needs review.</li>
            </ul>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}

export default GenerateInvoicePage
