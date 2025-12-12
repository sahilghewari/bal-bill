import apiClient from './api'

/**
 * Billing service for invoices and payments
 */
const billingService = {
  generateInvoice: async (customerId, invoiceData) => {
    try {
      const response = await apiClient.post(
        `/billing/${customerId}/generate-invoice`,
        invoiceData
      )
      return response.data.data?.invoice || response.data.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to generate invoice' }
    }
  },

  getInvoice: async (invoiceId) => {
    try {
      const response = await apiClient.get(`/billing/invoice/${invoiceId}`)
      return response.data.data?.invoice || response.data.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch invoice' }
    }
  },

  getCustomerInvoices: async (customerId, filters = {}) => {
    try {
      const endpoint = customerId ? `/billing/${customerId}/invoices` : '/billing/invoices'
      const response = await apiClient.get(endpoint, {
        params: filters,
      })
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch invoices' }
    }
  },

  getInvoiceLineItems: async (invoiceId) => {
    try {
      const response = await apiClient.get(`/billing/invoice/${invoiceId}/line-items`)
      return response.data.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch line items' }
    }
  },

  recordPayment: async (invoiceId, paymentData) => {
    try {
      const response = await apiClient.post(
        `/billing/invoice/${invoiceId}/payment`,
        paymentData
      )
      return response.data.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to record payment' }
    }
  },

  publishInvoice: async (invoiceId) => {
    try {
      const response = await apiClient.post(`/billing/invoice/${invoiceId}/publish`)
      return response.data.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to publish invoice' }
    }
  },

  cancelInvoice: async (invoiceId, payload = {}) => {
    try {
      const response = await apiClient.post(
        `/billing/invoice/${invoiceId}/cancel`,
        payload
      )
      return response.data.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to cancel invoice' }
    }
  },

  getBillingDashboard: async (customerId, period = '30') => {
    try {
      const response = await apiClient.get(`/billing/${customerId}/dashboard`, {
        params: { period },
      })
      return response.data.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch billing dashboard' }
    }
  },

  getInvoicePreview: async (customerId, params) => {
    try {
      const response = await apiClient.get(`/billing/${customerId}/preview`, {
        params,
      })
      return response.data.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch invoice preview' }
    }
  },
}

export default billingService
