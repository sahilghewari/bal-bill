import apiClient from './api'

/**
 * Stripe payment service
 */
const stripeService = {
  createPaymentIntent: async (invoiceId, paymentData) => {
    try {
      const response = await apiClient.post(
        `/stripe/invoice/${invoiceId}/create-intent`,
        paymentData
      )
      return response.data.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to create payment intent' }
    }
  },

  confirmPayment: async (paymentIntentId, paymentMethodId) => {
    try {
      const response = await apiClient.post(
        `/stripe/intent/${paymentIntentId}/confirm`,
        { payment_method_id: paymentMethodId }
      )
      return response.data.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to confirm payment' }
    }
  },

  getPaymentIntentStatus: async (paymentIntentId) => {
    try {
      const response = await apiClient.get(
        `/stripe/intent/${paymentIntentId}/status`
      )
      return response.data.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch payment status' }
    }
  },

  getPaymentMethods: async (customerId) => {
    try {
      const response = await apiClient.get(
        `/stripe/${customerId}/payment-methods`
      )
      return response.data.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch payment methods' }
    }
  },

  savePaymentMethod: async (customerId, paymentMethodId, isDefault = false) => {
    try {
      const response = await apiClient.post(
        `/stripe/${customerId}/payment-methods`,
        {
          payment_method_id: paymentMethodId,
          is_default: isDefault,
        }
      )
      return response.data.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to save payment method' }
    }
  },

  deletePaymentMethod: async (customerId, paymentMethodId) => {
    try {
      const response = await apiClient.delete(
        `/stripe/${customerId}/payment-methods/${paymentMethodId}`
      )
      return response.data.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to delete payment method' }
    }
  },

  getTransactionHistory: async (customerId, filters = {}) => {
    try {
      const response = await apiClient.get(
        `/stripe/${customerId}/transactions`,
        { params: filters }
      )
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch transactions' }
    }
  },
}

export default stripeService
