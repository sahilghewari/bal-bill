/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useState } from 'react'
import billingService from '../services/billingService'
import stripeService from '../services/stripeService'

export const BillingContext = createContext()

export const BillingProvider = ({ children }) => {
  const [invoices, setInvoices] = useState([])
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [billingLoading, setBillingLoading] = useState(false)
  const [billingError, setBillingError] = useState(null)
  const [currentPayment, setCurrentPayment] = useState(null)

  const fetchInvoices = useCallback(async (customerId, filters = {}) => {
    try {
      setBillingLoading(true)
      setBillingError(null)
      const response = await billingService.getCustomerInvoices(customerId, filters)
      setInvoices(response.data || [])
      return response
    } catch (error) {
      setBillingError(error?.error || 'Failed to fetch invoices')
      throw error
    } finally {
      setBillingLoading(false)
    }
  }, [])

  const fetchInvoice = useCallback(async (invoiceId) => {
    try {
      setBillingLoading(true)
      setBillingError(null)
      const invoice = await billingService.getInvoice(invoiceId)
      setSelectedInvoice(invoice)
      return invoice
    } catch (error) {
      setBillingError(error?.error || 'Failed to fetch invoice')
      throw error
    } finally {
      setBillingLoading(false)
    }
  }, [])

  const generateInvoice = useCallback(async (customerId, invoiceData) => {
    try {
      setBillingLoading(true)
      setBillingError(null)
      const invoice = await billingService.generateInvoice(customerId, invoiceData)
      setInvoices((prev) => [invoice, ...prev])
      return invoice
    } catch (error) {
      setBillingError(error?.error || 'Failed to generate invoice')
      throw error
    } finally {
      setBillingLoading(false)
    }
  }, [])

  const createPaymentIntent = useCallback(async (invoiceId, paymentData) => {
    try {
      setBillingLoading(true)
      setBillingError(null)
      const paymentIntent = await stripeService.createPaymentIntent(invoiceId, paymentData)
      setCurrentPayment(paymentIntent)
      return paymentIntent
    } catch (error) {
      setBillingError(error?.error || 'Failed to create payment intent')
      throw error
    } finally {
      setBillingLoading(false)
    }
  }, [])

  const confirmPayment = useCallback(async (paymentIntentId, paymentMethodId) => {
    try {
      setBillingLoading(true)
      setBillingError(null)
      const result = await stripeService.confirmPayment(paymentIntentId, paymentMethodId)
      return result
    } catch (error) {
      setBillingError(error?.error || 'Failed to confirm payment')
      throw error
    } finally {
      setBillingLoading(false)
    }
  }, [])

  const recordPayment = useCallback(async (invoiceId, paymentData) => {
    try {
      setBillingLoading(true)
      setBillingError(null)
      const result = await billingService.recordPayment(invoiceId, paymentData)
      setSelectedInvoice((prev) => (prev ? { ...prev, status: 'paid', paid_amount: paymentData.paid_amount } : prev))
      return result
    } catch (error) {
      setBillingError(error?.error || 'Failed to record payment')
      throw error
    } finally {
      setBillingLoading(false)
    }
  }, [])

  const cancelInvoice = useCallback(async (invoiceId, payload) => {
    try {
      setBillingLoading(true)
      setBillingError(null)
      const cancelled = await billingService.cancelInvoice(invoiceId, payload)
      setInvoices((prev) => prev.map((inv) => (inv.id === invoiceId ? cancelled : inv)))
      setSelectedInvoice((prev) => (prev && prev.id === invoiceId ? cancelled : prev))
      return cancelled
    } catch (error) {
      setBillingError(error?.error || 'Failed to cancel invoice')
      throw error
    } finally {
      setBillingLoading(false)
    }
  }, [])

  const value = {
    invoices,
    selectedInvoice,
    setSelectedInvoice,
    billingLoading,
    billingError,
    currentPayment,
    fetchInvoices,
    fetchInvoice,
    generateInvoice,
    createPaymentIntent,
    confirmPayment,
    recordPayment,
    cancelInvoice,
  }

  return <BillingContext.Provider value={value}>{children}</BillingContext.Provider>
}

export default BillingContext
