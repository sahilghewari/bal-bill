import apiClient from './api'

const schedulerService = {
  async getQueues() {
    const response = await apiClient.get('/scheduler/queues/health')
    return response.data
  },
}

export default schedulerService
