import { useContext } from 'react'
import AppContext from '../context/AppContext'
import CustomerContext from '../context/CustomerContext'
import BillingContext from '../context/BillingContext'

export const useAppContext = () => {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider')
  }
  return context
}

export const useCustomerContext = () => {
  const context = useContext(CustomerContext)
  if (!context) {
    throw new Error('useCustomerContext must be used within CustomerProvider')
  }
  return context
}

export const useBillingContext = () => {
  const context = useContext(BillingContext)
  if (!context) {
    throw new Error('useBillingContext must be used within BillingProvider')
  }
  return context
}
