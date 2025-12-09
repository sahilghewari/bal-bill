import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CreditCard, Download, XCircle } from 'lucide-react'
import MainLayout from '../../components/layout/MainLayout'
import Header from '../../components/layout/Header'
import {
  Card,
  Button,
  Badge,
  Alert,
  Skeleton,
  Modal,
} from '../../components/common'
import PaymentForm from '../../components/billing/PaymentForm'
import { useAppContext, useBillingContext } from '../../hooks/useAppContext'
import billingService from '../../services/billingService'

const InvoiceDetailPage = () => {
  const { invoiceId } = useParams()
  const navigate = useNavigate()
  const { addNotification } = useAppContext()
  const { fetchInvoice, recordPayment, cancelInvoice } = useBillingContext()
  const [invoice, setInvoice] = useState(null)
  const [lineItems, setLineItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)

  const loadInvoice = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchInvoice(invoiceId)
      setInvoice(data)
      const items = await billingService.getInvoiceLineItems(invoiceId)
      setLineItems(items || [])
    } catch (err) {
      setError(err?.error || 'Failed to load invoice')
    } finally {
      setLoading(false)
    }
  }, [fetchInvoice, invoiceId])

  useEffect(() => {
    loadInvoice()
  }, [loadInvoice])

  const handleRecordPayment = async (paymentData) => {
    try {
      await recordPayment(invoiceId, paymentData)
      addNotification({
        type: 'success',
        title: 'Payment recorded',
        message: 'The invoice has been updated with the new payment.',
      })
      setPaymentModalOpen(false)
      await loadInvoice()
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Payment failed',
        message: err?.error || 'Unable to record payment',
      })
      throw err
    }
  }

  const handleCancelInvoice = async () => {
    if (!invoice) return

    try {
      setCancelLoading(true)
      await cancelInvoice(invoice.id, { reason: 'Cancelled manually from UI' })
      addNotification({
        type: 'success',
        title: 'Invoice cancelled',
        message: 'Invoice status has been updated to cancelled.',
      })
      await loadInvoice()
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Cancellation failed',
        message: err?.error || 'Unable to cancel invoice',
      })
    } finally {
      setCancelLoading(false)
    }
  }

  const downloadInvoice = () => {
    addNotification({
      type: 'info',
      title: 'Preparing download',
      message: 'Invoice PDF will be available soon.',
    })
  }

  const getStatusVariant = (status) => {
    const variants = {
      draft: 'gray',
      issued: 'info',
      paid: 'success',
      overdue: 'warning',
      cancelled: 'danger',
    }
    return variants[status] || 'gray'
  }

  const formatCurrency = (value, currency = 'USD') => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return '—'
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(Number(value))
  }

  const formatDate = (value) => {
    if (!value) return '—'
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString()
  }

  const summaryValues = useMemo(() => {
    const currency = invoice?.currency || 'USD'
    const subtotal = invoice?.subtotal_amount ?? invoice?.subtotal
    const taxes = invoice?.tax_amount
    const discounts = invoice?.discount_amount
    const total = invoice?.total_amount
    const paid = invoice?.paid_amount
    const balance = invoice?.balance_due ?? (Number(total) - Number(paid || 0))

    return [
      { label: 'Subtotal', value: formatCurrency(subtotal, currency) },
      { label: 'Taxes', value: formatCurrency(taxes, currency) },
      { label: 'Discounts', value: formatCurrency(discounts, currency) },
      { label: 'Total', value: formatCurrency(total, currency), emphasize: true },
      { label: 'Paid', value: formatCurrency(paid, currency) },
      {
        label: 'Balance Due',
        value: formatCurrency(balance, currency),
        highlight: true,
      },
    ]
  }, [invoice])

  if (loading) {
    return (
      <MainLayout>
        <Header title="Loading invoice" breadcrumbs={['Billing', 'Invoices']} />
        <Card>
          <Skeleton height="h-96" />
        </Card>
      </MainLayout>
    )
  }

  if (error || !invoice) {
    return (
      <MainLayout>
        <Header title="Invoice" breadcrumbs={['Billing', 'Invoices']} />
        <Alert type="error" title="Unable to load invoice" message={error || 'Invoice not found'} />
        <Button className="mt-4" variant="outline" onClick={() => navigate('/invoices')}>
          Go back
        </Button>
      </MainLayout>
    )
  }

  const paymentHistory = invoice.payments || []
  const statusAllowsPayment = ['issued', 'overdue'].includes(invoice.status)
  const allowCancellation = ['draft', 'issued', 'overdue'].includes(invoice.status)
  const currency = invoice.currency || 'USD'

  return (
    <MainLayout>
      <Header
        title={`Invoice #${invoice.invoice_number}`}
        description={`Customer: ${invoice.customer_name || 'Unknown'}`}
        breadcrumbs={['Billing', 'Invoices', invoice.invoice_number]}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/invoices')}>
              Back to list
            </Button>
            <Button variant="outline" icon={Download} onClick={downloadInvoice}>
              Download PDF
            </Button>
            {statusAllowsPayment && (
              <Button icon={CreditCard} onClick={() => setPaymentModalOpen(true)}>
                Record Payment
              </Button>
            )}
            {allowCancellation && (
              <Button
                variant="outline"
                icon={XCircle}
                onClick={handleCancelInvoice}
                loading={cancelLoading}
              >
                Cancel Invoice
              </Button>
            )}
          </div>
        }
      />

      {invoice.status === 'overdue' && (
        <Alert
          type="warning"
          title="Invoice overdue"
          message="This invoice is past due. Consider recording a payment or sending a reminder."
          className="mb-6"
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="flex flex-col gap-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-500">Invoice Number</p>
                  <h2 className="text-2xl font-semibold text-gray-900">#{invoice.invoice_number}</h2>
                </div>
                <Badge variant={getStatusVariant(invoice.status)}>
                  {(invoice.status || '').toUpperCase() || 'UNKNOWN'}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Invoice Date</p>
                  <p className="font-semibold">{formatDate(invoice.created_at)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Due Date</p>
                  <p className="font-semibold">{formatDate(invoice.due_date)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Billing Period</p>
                  <p className="font-semibold text-xs">
                    {formatDate(invoice.billing_period_start)} - {formatDate(invoice.billing_period_end)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Bill To</p>
                  <p className="mt-1 text-gray-700">{invoice.customer_name}</p>
                  <p className="text-sm text-gray-500">{invoice.customer_email}</p>
                  {invoice.billing_address && (
                    <p className="text-sm text-gray-500 mt-2 whitespace-pre-line">
                      {invoice.billing_address}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Payment Terms</p>
                  <p className="mt-1 text-gray-700">{invoice.payment_terms || 'Net 30'}</p>
                  {invoice.purchase_order && (
                    <p className="text-sm text-gray-500 mt-2">PO: {invoice.purchase_order}</p>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Line Items</h3>
              <span className="text-sm text-gray-500">{lineItems.length} items</span>
            </div>
            {lineItems.length > 0 ? (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-gray-200">
                      <th className="py-3 px-4 font-semibold">Description</th>
                      <th className="py-3 px-4 font-semibold text-right">Quantity</th>
                      <th className="py-3 px-4 font-semibold text-right">Unit Price</th>
                      <th className="py-3 px-4 font-semibold text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, index) => (
                      <tr key={item.id || index} className="border-b border-gray-100">
                        <td className="py-3 px-4">
                          <p className="font-medium text-gray-900">{item.description || item.name}</p>
                          {item.details && (
                            <p className="text-xs text-gray-500 mt-1">{item.details}</p>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-600">{item.quantity || item.units || 1}</td>
                        <td className="py-3 px-4 text-right text-gray-600">
                          {formatCurrency(item.unit_price || item.rate || item.price, currency)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold">
                          {formatCurrency(item.amount || item.total || item.total_price, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No line items found for this invoice.</p>
            )}
          </Card>

          {invoice.notes && (
            <Card>
              <h3 className="text-lg font-semibold mb-3">Notes</h3>
              <p className="text-sm text-gray-600 whitespace-pre-line">{invoice.notes}</p>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <h3 className="text-lg font-semibold mb-4">Billing Summary</h3>
            <div className="space-y-3">
              {summaryValues.map((item) => (
                <div
                  key={item.label}
                  className={`flex items-center justify-between text-sm ${item.highlight ? 'py-2 border-t border-gray-200 font-semibold text-primary' : ''}`}
                >
                  <span className="text-gray-600">{item.label}</span>
                  <span className={`${item.emphasize ? 'text-lg font-bold' : 'font-semibold'}`}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold mb-4">Payment History</h3>
            {paymentHistory.length === 0 ? (
              <p className="text-sm text-gray-500">No payments recorded yet.</p>
            ) : (
              <div className="space-y-4">
                {paymentHistory.map((payment, index) => (
                  <div key={payment.id || payment.reference || index} className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {formatCurrency(payment.amount || payment.paid_amount, currency)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(payment.payment_date)} • {payment.method || payment.payment_method || 'Payment'}
                      </p>
                    </div>
                    <Badge variant="success">Paid</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <Modal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title="Record Payment"
        size="lg"
      >
        <PaymentForm
          invoiceId={invoice.id || invoiceId}
          invoiceAmount={invoice.balance_due || invoice.total_amount}
          currency={currency}
          onSubmit={handleRecordPayment}
          onClose={() => setPaymentModalOpen(false)}
        />
      </Modal>
    </MainLayout>
  )
}

export default InvoiceDetailPage
