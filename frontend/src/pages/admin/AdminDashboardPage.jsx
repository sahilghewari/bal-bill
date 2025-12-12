import React, { useEffect } from 'react'
import { BarChart3, TrendingUp, Users, AlertCircle } from 'lucide-react'
import MainLayout from '../../components/layout/MainLayout'
import Header from '../../components/layout/Header'
import { Card, Skeleton, Alert } from '../../components/common'
import { useAppContext } from '../../hooks/useAppContext'
import ReportExporter from '../../components/analytics/ReportExporter'
import StatCard from '../../components/dashboard/StatCard'
import QueueHealthCard from '../../components/admin/QueueHealthCard'
import useQueueHealth from '../../hooks/useQueueHealth'
import NotificationFeedCard from '../../components/admin/NotificationFeedCard'
import useNotificationFeed from '../../hooks/useNotificationFeed'

/**
 * Admin Dashboard Page
 */
const AdminDashboardPage = () => {
  const {
    dashboardData,
    dashboardLoading,
    dashboardError,
    fetchDashboardData,
  } = useAppContext()

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  const queueHealth = useQueueHealth()
  const notificationFeed = useNotificationFeed({ pollInterval: 60000 })

  const formatCurrency = (value) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(value || 0))

  const overdueCount = dashboardData?.financials?.overdue_count || 0

  return (
    <MainLayout>
      <Header
        title="Admin Dashboard"
        description="System overview and key metrics"
        breadcrumbs={['Admin', 'Dashboard']}
        action={<ReportExporter />}
      />

      {dashboardError && (
        <Alert type="error" title="Error" message={dashboardError} className="mb-6" />
      )}

      {/* Key Metrics */}
      {dashboardLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {[...Array(4)].map((_, idx) => (
            <Skeleton key={idx} height="h-24" />
          ))}
        </div>
      ) : dashboardData ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <StatCard
            title="Active Customers"
            value={dashboardData.customers?.active || 0}
            icon={Users}
            backgroundColor="bg-blue-50"
            iconColor="text-blue-600"
          />

          <StatCard
            title="Total Revenue"
            value={formatCurrency(dashboardData.financials?.total_invoiced)}
            icon={TrendingUp}
            backgroundColor="bg-success/10"
            iconColor="text-success"
          />

          <StatCard
            title="Outstanding Balance"
            value={formatCurrency(dashboardData.financials?.outstanding)}
            icon={AlertCircle}
            backgroundColor="bg-warning/10"
            iconColor="text-warning"
          />

          <StatCard
            title="Payment Success Rate"
            value={`${Number(dashboardData.financials?.payment_success_rate || 0).toFixed(1)}%`}
            icon={BarChart3}
            backgroundColor="bg-success/10"
            iconColor="text-success"
            positive
          />
        </div>
      ) : null}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Health */}
        <Card>
          <h3 className="text-lg font-semibold mb-4">System Health</h3>
          {dashboardLoading ? (
            <Skeleton height="h-32" />
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Database Status</span>
                <span className="px-3 py-1 bg-success/10 text-success rounded-full text-sm font-medium">
                  ✓ Healthy
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">API Status</span>
                <span className="px-3 py-1 bg-success/10 text-success rounded-full text-sm font-medium">
                  ✓ Operational
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Last Backup</span>
                <span className="text-sm font-medium">Today at 02:00 AM</span>
              </div>
            </div>
          )}
        </Card>
        <QueueHealthCard
          queue_available={queueHealth.queue_available}
          queues={queueHealth.queues}
          loading={queueHealth.loading}
          error={queueHealth.error}
          onRefresh={queueHealth.refresh}
        />
      </div>

      <div className="mt-6">
        <NotificationFeedCard
          events={notificationFeed.events}
          loading={notificationFeed.loading}
          error={notificationFeed.error}
          onRefresh={notificationFeed.refresh}
        />
      </div>
    </MainLayout>
  )
}

export default AdminDashboardPage
