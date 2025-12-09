/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useEffect, useState } from 'react'
import { useLocalStorage } from '../hooks/useApi'
import adminService from '../services/adminService'

export const AppContext = createContext()

export const AppProvider = ({ children }) => {
  const [user, setUser] = useLocalStorage('user', null)
  const [theme, setTheme] = useLocalStorage('theme', 'light')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [notifications, setNotifications] = useState([])
  const [dashboardData, setDashboardData] = useState(null)
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [dashboardError, setDashboardError] = useState(null)

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }, [setTheme])

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev)
  }, [])

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== id))
  }, [])

  const addNotification = useCallback((notification) => {
    const id = Date.now()
    const newNotification = {
      id,
      timestamp: new Date(),
      ...notification,
    }

    setNotifications((prev) => [newNotification, ...prev])

    if (notification.type === 'success') {
      setTimeout(() => {
        removeNotification(id)
      }, 5000)
    }

    return id
  }, [removeNotification])

  const clearNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  const fetchDashboardData = useCallback(async (period = '30') => {
    try {
      setDashboardLoading(true)
      setDashboardError(null)
      const data = await adminService.getDashboardOverview(period)
      setDashboardData(data)
      return data
    } catch (error) {
      const errorMessage = error?.error || 'Failed to fetch dashboard data'
      setDashboardError(errorMessage)
      addNotification({
        type: 'error',
        title: 'Error',
        message: errorMessage,
      })
    } finally {
      setDashboardLoading(false)
    }
  }, [addNotification])

  const login = useCallback((userData) => {
    setUser(userData)
    addNotification({
      type: 'success',
      title: 'Welcome',
      message: `Welcome back, ${userData.name}!`,
    })
  }, [setUser, addNotification])

  const logout = useCallback(() => {
    setUser(null)
    setNotifications([])
    localStorage.removeItem('authToken')
    addNotification({
      type: 'info',
      title: 'Logged Out',
      message: 'You have been logged out successfully.',
    })
  }, [setUser, addNotification])

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  const value = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    theme,
    toggleTheme,
    sidebarOpen,
    toggleSidebar,
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
    dashboardData,
    dashboardLoading,
    dashboardError,
    fetchDashboardData,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export default AppContext
