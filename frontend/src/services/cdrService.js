import apiClient from './api'

/**
 * CDR service for call detail records
 */
const cdrService = {
  importCDR: async (cdrData) => {
    try {
      const response = await apiClient.post('/cdrs/import', cdrData)
      return response.data.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to import CDR' }
    }
  },

  importBatchCDRs: async (cdrsData) => {
    try {
      const response = await apiClient.post('/cdrs/import-batch', {
        cdrs: cdrsData,
      })
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to import CDRs' }
    }
  },

  processCDR: async (cdrId) => {
    try {
      const response = await apiClient.post(`/cdrs/process/${cdrId}`)
      return response.data.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to process CDR' }
    }
  },

  processCustomerCDRs: async (customerId) => {
    try {
      const response = await apiClient.post(`/cdrs/process-customer/${customerId}`)
      return response.data.results
    } catch (error) {
      throw error.response?.data || { error: 'Failed to process customer CDRs' }
    }
  },

  getCustomerCDRs: async (customerId, filters = {}) => {
    try {
      const response = await apiClient.get(`/cdrs/customer/${customerId}`, {
        params: filters,
      })
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch CDRs' }
    }
  },

  getCDR: async (cdrId) => {
    try {
      const response = await apiClient.get(`/cdrs/detail/${cdrId}`)
      return response.data.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch CDR' }
    }
  },

  getBillingStats: async (customerId, dateRange = {}) => {
    try {
      const response = await apiClient.get(`/cdrs/stats/${customerId}`, {
        params: dateRange,
      })
      return response.data.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch billing stats' }
    }
  },
}

export default cdrService
