import apiClient from './api'

/**
 * Rate card service for pricing management
 */
const rateCardService = {
  createRateCard: async (rateCardData) => {
    try {
      const response = await apiClient.post('/rateCards', rateCardData)
      return response.data.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to create rate card' }
    }
  },

  getRateCardById: async (rateCardId) => {
    try {
      const response = await apiClient.get(`/rateCards/${rateCardId}`)
      return response.data.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch rate card' }
    }
  },

  getCustomerRateCards: async (customerId) => {
    try {
      const response = await apiClient.get(`/rateCards/customer/${customerId}`)
      return response.data.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch rate cards' }
    }
  },

  getActiveRateCard: async (customerId, serviceType, callDate) => {
    try {
      const response = await apiClient.get(
        `/rateCards/customer/${customerId}/active`,
        { params: { service_type: serviceType, call_date: callDate } }
      )
      return response.data.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch active rate card' }
    }
  },

  updateRateCard: async (rateCardId, rateCardData) => {
    try {
      const response = await apiClient.put(`/rateCards/${rateCardId}`, rateCardData)
      return response.data.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to update rate card' }
    }
  },

  deactivateRateCard: async (rateCardId) => {
    try {
      const response = await apiClient.post(`/rateCards/${rateCardId}/deactivate`)
      return response.data.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to deactivate rate card' }
    }
  },

  createRateCardVersion: async (customerId, versionData) => {
    try {
      const response = await apiClient.post(
        `/rateCards/${customerId}/version`,
        versionData
      )
      return response.data.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to create rate card version' }
    }
  },

  simulateBilling: async (customerId, simulationData) => {
    try {
      const response = await apiClient.post(
        `/rateCards/${customerId}/simulate`,
        simulationData
      )
      return response.data.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to simulate billing' }
    }
  },

  getRateCardHistory: async (customerId, serviceType = null) => {
    try {
      const response = await apiClient.get(
        `/rateCards/customer/${customerId}/history`,
        { params: serviceType ? { service_type: serviceType } : {} }
      )
      return response.data.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch rate card history' }
    }
  },

  getRateCardStats: async (customerId) => {
    try {
      const response = await apiClient.get(`/rateCards/customer/${customerId}/stats`)
      return response.data.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch rate card stats' }
    }
  },

  compareRateCards: async (rateCard1Id, rateCard2Id, testDuration) => {
    try {
      const response = await apiClient.post('/rateCards/compare', {
        rate_card_id_1: rateCard1Id,
        rate_card_id_2: rateCard2Id,
        test_duration: testDuration,
      })
      return response.data.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to compare rate cards' }
    }
  },
}

export default rateCardService
