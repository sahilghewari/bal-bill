import apiClient from './api'

/**
 * Customer service for all customer-related API calls
 */
const customerService = {
  getAllCustomers: async (page = 1, limit = 20, search = '') => {
    try {
      const response = await apiClient.get('/customers', {
        params: { page, limit, search },
      })
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch customers' }
    }
  },

  getCustomerById: async (customerId) => {
    try {
      const response = await apiClient.get(`/customers/${customerId}`)
      return response.data.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch customer' }
    }
  },

  getCustomerSummary: async (customerId) => {
    try {
      const response = await apiClient.get(`/customers/${customerId}/summary`)
      return response.data.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch customer summary' }
    }
  },

  createCustomer: async (customerData) => {
    try {
      const response = await apiClient.post('/customers', customerData)
      return response.data.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to create customer' }
    }
  },

  updateCustomer: async (customerId, customerData) => {
    try {
      const response = await apiClient.put(`/customers/${customerId}`, customerData)
      return response.data.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to update customer' }
    }
  },

  deleteCustomer: async (customerId) => {
    try {
      const response = await apiClient.delete(`/customers/${customerId}`)
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to delete customer' }
    }
  },

  getBalance: async (customerId) => {
    try {
      const response = await apiClient.get(`/customers/${customerId}/balance`)
      return response.data.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch balance' }
    }
  },

  addCredit: async (customerId, creditData) => {
    try {
      const response = await apiClient.post(
        `/customers/${customerId}/add-credit`,
        creditData
      )
      return response.data.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to add credit' }
    }
  },

  adjustBalance: async (customerId, adjustmentData) => {
    try {
      const response = await apiClient.post(
        `/customers/${customerId}/adjust-balance`,
        adjustmentData
      )
      return response.data.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to adjust balance' }
    }
  },

  getBalanceHistory: async (customerId, page = 1, limit = 50) => {
    try {
      const response = await apiClient.get(
        `/customers/${customerId}/balance-history`,
        { params: { page, limit } }
      )
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch balance history' }
    }
  },

  getCustomerStats: async () => {
    try {
      const response = await apiClient.get('/customers/stats/overview')
      return response.data.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch customer stats' }
    }
  },

  searchCustomers: async (query) => {
    try {
      const response = await apiClient.get('/customers/search', {
        params: { query },
      })
      return response.data.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to search customers' }
    }
  },
}

export default customerService
