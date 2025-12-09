import React, { useEffect } from 'react'
import { Card, Skeleton } from '../common'
import StatCard from '../dashboard/StatCard'
import { TrendingUp, AlertCircle, CheckCircle } from 'lucide-react'
import billingService from '../../services/billingService'
import { useApi } from '../../hooks/useApi'

/**
 * Billing Dashboard Component
 */
const BillingDashboard = ({ customerId }) => {
  const {
    data: dashboard,
    loading,
    execute: fetchDashboard,
  } = useApi(() => billingService.getBillingDashboard(customerId, '30'), false)

  useEffect(() => {
    if (customerId) {
      fetchDashboard()
    }
  }, [customerId, fetchDashboard])

  if (!customerId) {
    return <Card>Select a customer to view billing stats.</Card>
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Skeleton height="h-24" />
        <Skeleton height="h-24" />
        <Skeleton height="h-24" />
      </div>
    )
  }

  if (!dashboard) {
    return <Card>No billing data available</Card>
  }

  const formatAmount = (value = 0) => `$${Number(value || 0).toFixed(2)}`

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <StatCard
        title="Total Invoiced"
        value={formatAmount(dashboard.total_invoiced)}
        icon={TrendingUp}
        backgroundColor="bg-blue-50"
        iconColor="text-blue-600"
      />

      <StatCard
        title="Amount Paid"
        value={formatAmount(dashboard.total_paid)}
        icon={CheckCircle}
        backgroundColor="bg-success/10"
        iconColor="text-success"
      />

      <StatCard
        title="Outstanding"
        value={formatAmount(dashboard.outstanding)}
        icon={AlertCircle}
        backgroundColor="bg-warning/10"
        iconColor="text-warning"
      />
    </div>
  )
}

export default BillingDashboard
