/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useState } from 'react'
import customerService from '../services/customerService'

export const CustomerContext = createContext()

export const CustomerProvider = ({ children }) => {
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [customers, setCustomers] = useState([])
  const [customerLoading, setCustomerLoading] = useState(false)
  const [customerError, setCustomerError] = useState(null)
  const [customerStats, setCustomerStats] = useState(null)

  const fetchCustomer = useCallback(async (customerId) => {
    try {
      setCustomerLoading(true)
      setCustomerError(null)
      const customer = await customerService.getCustomerById(customerId)
      setSelectedCustomer(customer)
      return customer
    } catch (error) {
      setCustomerError(error?.error || 'Failed to fetch customer')
      throw error
    } finally {
      setCustomerLoading(false)
    }
  }, [])

  const fetchCustomers = useCallback(async (page = 1, limit = 20) => {
    try {
      setCustomerLoading(true)
      setCustomerError(null)
      const response = await customerService.getAllCustomers(page, limit)
      setCustomers(response.data || [])
      return response
    } catch (error) {
      setCustomerError(error?.error || 'Failed to fetch customers')
      throw error
    } finally {
      setCustomerLoading(false)
    }
  }, [])

  const createCustomer = useCallback(async (customerData) => {
    try {
      setCustomerLoading(true)
      setCustomerError(null)
      const newCustomer = await customerService.createCustomer(customerData)
      setCustomers((prev) => [newCustomer, ...prev])
      return newCustomer
    } catch (error) {
      setCustomerError(error?.error || 'Failed to create customer')
      throw error
    } finally {
      setCustomerLoading(false)
    }
  }, [])

  const updateCustomer = useCallback(async (customerId, customerData) => {
    try {
      setCustomerLoading(true)
      setCustomerError(null)
      const updatedCustomer = await customerService.updateCustomer(customerId, customerData)
      setSelectedCustomer(updatedCustomer)
      setCustomers((prev) => prev.map((c) => (c.id === customerId ? updatedCustomer : c)))
      return updatedCustomer
    } catch (error) {
      setCustomerError(error?.error || 'Failed to update customer')
      throw error
    } finally {
      setCustomerLoading(false)
    }
  }, [])

  const deleteCustomer = useCallback(async (customerId) => {
    try {
      setCustomerLoading(true)
      setCustomerError(null)
      await customerService.deleteCustomer(customerId)
      setCustomers((prev) => prev.filter((c) => c.id !== customerId))
      setSelectedCustomer((prev) => (prev?.id === customerId ? null : prev))
    } catch (error) {
      setCustomerError(error?.error || 'Failed to delete customer')
      throw error
    } finally {
      setCustomerLoading(false)
    }
  }, [])

  const fetchCustomerStats = useCallback(async () => {
    try {
      setCustomerError(null)
      const stats = await customerService.getCustomerStats()
      setCustomerStats(stats)
      return stats
    } catch (error) {
      setCustomerError(error?.error || 'Failed to fetch customer stats')
    }
  }, [])

  const value = {
    selectedCustomer,
    setSelectedCustomer,
    customers,
    customerLoading,
    customerError,
    customerStats,
    fetchCustomer,
    fetchCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    fetchCustomerStats,
  }

  return <CustomerContext.Provider value={value}>{children}</CustomerContext.Provider>
}

export default CustomerContext
