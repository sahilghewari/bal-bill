import { useEffect, useState, useCallback } from 'react'
import adminService from '../services/adminService'

const DEFAULT_POLL_INTERVAL = 30000

const useNotificationFeed = (
  { pollInterval = DEFAULT_POLL_INTERVAL, initialLimit } = {}
) => {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchFeed = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await adminService.getNotificationFeed(initialLimit)
      setEvents(data?.data || [])
    } catch (fetchError) {
      const message = fetchError?.error || 'Failed to load notifications'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [initialLimit])

  useEffect(() => {
    fetchFeed()

    if (!pollInterval) {
      return undefined
    }

    const handle = setInterval(fetchFeed, pollInterval)
    return () => clearInterval(handle)
  }, [fetchFeed, pollInterval])

  return {
    events,
    loading,
    error,
    refresh: fetchFeed,
  }
}

export default useNotificationFeed
