import { useCallback, useEffect, useState } from 'react'
import schedulerService from '../services/schedulerService'
import { useAppContext } from './useAppContext'

const DEFAULT_STATE = {
  queue_available: false,
  queues: [],
}

const useQueueHealth = () => {
  const [state, setState] = useState(DEFAULT_STATE)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { addNotification } = useAppContext()

  const fetchQueueHealth = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await schedulerService.getQueues()
      setState({
        queue_available: data.queue_available,
        queues: data.queues || [],
      })
      return data
    } catch (err) {
      const message = err?.error || 'Failed to fetch scheduler queues'
      setError(message)
      addNotification?.({ type: 'error', title: 'Scheduler Error', message })
      throw err
    } finally {
      setLoading(false)
    }
  }, [addNotification])

  useEffect(() => {
    fetchQueueHealth()
  }, [fetchQueueHealth])

  return {
    ...state,
    loading,
    error,
    refresh: fetchQueueHealth,
  }
}

export default useQueueHealth
