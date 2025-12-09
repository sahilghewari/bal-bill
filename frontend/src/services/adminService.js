import apiClient from './api'

/**
 * Admin service for analytics and reporting
 */
const adminService = {
  getDashboardOverview: async (period = '30') => {
    try {
      const response = await apiClient.get('/admin/dashboard/overview', {
        params: { period },
      })
      return response.data.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch dashboard' }
    }
  },

  getCustomerAnalytics: async () => {
    try {
      const response = await apiClient.get('/admin/analytics/customers')
      return response.data.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch customer analytics' }
    }
  },

  getRevenueReport: async (period = '90') => {
    try {
      const response = await apiClient.get('/admin/analytics/revenue', {
        params: { period },
      })
      return response.data.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch revenue report' }
    }
  },

  getPaymentAnalytics: async (period = '30') => {
    try {
      const response = await apiClient.get('/admin/analytics/payments', {
        params: { period },
      })
      return response.data.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch payment analytics' }
    }
  },

  getUsageAnalytics: async (period = '30') => {
    try {
      const response = await apiClient.get('/admin/analytics/usage', {
        params: { period },
      })
      return response.data.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch usage analytics' }
    }
  },

  getInvoiceStatusReport: async () => {
    try {
      const response = await apiClient.get('/admin/reports/invoice-status')
      return response.data.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch invoice status report' }
    }
  },

  getSystemHealth: async () => {
    try {
      const response = await apiClient.get('/admin/system/health')
      return response.data.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch system health' }
    }
  },

  getSystemLogs: async (filters = {}) => {
    try {
      const response = await apiClient.get('/admin/system/logs', {
        params: filters,
      })
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch system logs' }
    }
  },

  exportReport: async (reportType = 'overview', period = '30') => {
    try {
      const response = await apiClient.get('/admin/reports/export', {
        params: { report_type: reportType, period },
      })
      return response.data
    } catch (error) {
      throw error.response?.data || { error: 'Failed to export report' }
    }
  },
}

export default adminService
