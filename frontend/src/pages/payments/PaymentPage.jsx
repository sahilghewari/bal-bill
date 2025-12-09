import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import MainLayout from '../../components/layout/MainLayout'
import Header from '../../components/layout/Header'
import { Card, Skeleton, Alert } from '../../components/common'
import StripeProvider from '../../components/payment/StripeProvider'
import StripeCardPayment from '../../components/payment/StripeCardPayment'
import { useAppContext, useBillingContext } from '../../hooks/useAppContext'
import billingService from '../../services/billingService'

/**
 * Payment Page
 */
const PaymentPage = () => {
  const { invoiceId } = useParams()
  const navigate = useNavigate()
  const { addNotification } = useAppContext()
  const { recordPayment } = useBillingContext()
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [processing, setProcessing] = useState(false)

  const loadInvoice = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await billingService.getInvoice(invoiceId)
      setInvoice(data)
    } catch (err) {
      setError(err?.error || 'Failed to load invoice')
    } finally {
      setLoading(false)
    }
  }, [invoiceId])

  useEffect(() => {
    loadInvoice()
  }, [loadInvoice])

  const handlePaymentSuccess = async () => {
    if (!invoice) return
    try {
      setProcessing(true)
      await recordPayment(invoiceId, {
        paid_amount: invoice.balance_due || invoice.total_amount,
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'card',
        notes: 'Recorded via Stripe checkout',
      })

      addNotification({
        type: 'success',
        title: 'Payment Successful',
        message: `Payment of ${invoice.currency} ${(invoice.balance_due || invoice.total_amount).toFixed(2)} has been processed.`,
      })

      navigate(`/invoices/${invoiceId}`)
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: err?.error || 'Failed to record payment',
      })
    } finally {
      setProcessing(false)
    }
  }

  const handlePaymentError = (err) => {
    addNotification({
      type: 'error',
      title: 'Payment Failed',
      message: err?.message || 'Payment processing failed',
    })
  }

  const formatCurrency = (value) => {
    const amount = Number(value) || 0
    return `${invoice?.currency || 'USD'} ${amount.toFixed(2)}`
  }

  const formatDate = (value) => {
    if (!value) return '—'
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString()
  }

  if (loading) {
    return (
      <MainLayout>
        <Header title="Payment" />
        <Card>
          <Skeleton height="h-96" />
        </Card>
      </MainLayout>
    )
  }

  if (error || !invoice) {
    return (
      <MainLayout>
        <Header title="Payment" />
        <Alert type="error" title="Error" message={error || 'Invoice not found'} />
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <Header
        title="Process Payment"
        description={`Invoice #${invoice.invoice_number}`}
        breadcrumbs={['Payments', invoice.invoice_number]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <StripeProvider amount={invoice.balance_due || invoice.total_amount} currency={invoice.currency}>
              <StripeCardPayment
                amount={invoice.balance_due || invoice.total_amount}
                currency={invoice.currency}
                invoiceId={invoiceId}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                loading={processing}
              />
            </StripeProvider>
          </Card>
        </div>

        <Card>
          <h3 className="font-semibold mb-4">Invoice Summary</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Invoice #</span>
              <span className="font-medium">{invoice.invoice_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Customer</span>
              <span className="font-medium">{invoice.customer_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Period</span>
              <span className="font-medium text-xs">
                {formatDate(invoice.billing_period_start)} - {formatDate(invoice.billing_period_end)}
              </span>
            </div>
            <div className="border-t border-gray-200 pt-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span>{formatCurrency(invoice.subtotal_amount || invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax</span>
                <span>{formatCurrency(invoice.tax_amount || invoice.tax)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Discounts</span>
                <span>-{formatCurrency(invoice.discount_amount || 0)}</span>
              </div>
            </div>
            <div className="border-t border-gray-200 pt-3">
              <div className="flex justify-between font-bold text-base">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(invoice.total_amount)}</span>
              </div>
            </div>
            <div className="bg-blue-50 p-3 rounded text-xs text-blue-800">
              <p className="font-semibold mb-1">Due Date</p>
              <p>{formatDate(invoice.due_date)}</p>
            </div>
          </div>
        </Card>
      </div>
    </MainLayout>
  )
}

export default PaymentPage
