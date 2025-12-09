import React, { useEffect, useMemo, useState } from 'react'
import { BarChart3, TrendingUp, Users } from 'lucide-react'
import MainLayout from '../../components/layout/MainLayout'
import Header from '../../components/layout/Header'
import { Card, Button, Select, Skeleton, Alert } from '../../components/common'
import { useApi } from '../../hooks/useApi'
import StatCard from '../../components/dashboard/StatCard'
import adminService from '../../services/adminService'

/**
 * Revenue Analytics Page
 */
const RevenueAnalyticsPage = () => {
  const [period, setPeriod] = useState('90')
  const [showChart, setShowChart] = useState(false)

  const {
    data: revenueData,
    loading,
    error,
    execute: fetchRevenue,
  } = useApi(() => adminService.getRevenueReport(period), false)

  useEffect(() => {
    fetchRevenue()
  }, [period, fetchRevenue])

  const periods = useMemo(() => ([
    { value: '30', label: 'Last 30 Days' },
    { value: '60', label: 'Last 60 Days' },
    { value: '90', label: 'Last 90 Days' },
    { value: '180', label: 'Last 6 Months' },
    { value: '365', label: 'Last 12 Months' },
  ]), [])

  const formatCurrency = (value) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(value || 0))

  const topCustomers = revenueData?.top_customers || []
  const revenueByService = revenueData?.by_service_type || []
  const totalRevenue = Number(revenueData?.total_revenue || 0) || 1

  return (
    <MainLayout>
      <Header
        title="Revenue Analytics"
        description="Track revenue trends and performance metrics"
        breadcrumbs={['Analytics', 'Revenue']}
      />

      {/* Period Selector */}
      <Card className="mb-6">
        <div className="flex flex-col md:flex-row items-end gap-4">
          <div className="w-full md:w-48">
            <Select
              label="Time Period"
              options={periods}
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            />
          </div>
          <Button onClick={() => setShowChart((prev) => !prev)}>
            {showChart ? 'Hide Chart' : 'Show Chart'}
          </Button>
        </div>
      </Card>

      {/* Main Stats */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {[...Array(4)].map((_, idx) => (
            <Skeleton key={idx} height="h-24" />
          ))}
        </div>
      ) : error ? (
        <Alert type="error" title="Error" message={error} className="mb-6" />
      ) : revenueData ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <StatCard
            title="Total Revenue"
            value={formatCurrency(revenueData.total_revenue)}
            icon={TrendingUp}
            backgroundColor="bg-success/10"
            iconColor="text-success"
          />

          <StatCard
            title="Average Invoice"
            value={formatCurrency(revenueData.average_invoice)}
            icon={BarChart3}
            backgroundColor="bg-blue-50"
            iconColor="text-blue-600"
          />

          <StatCard
            title="Top Customer"
            value={formatCurrency(revenueData.top_customer_revenue)}
            icon={Users}
            backgroundColor="bg-purple-50"
            iconColor="text-purple-600"
          />

          <StatCard
            title="Revenue Growth"
            value={`${Number(revenueData.growth_rate || 0).toFixed(1)}%`}
            trend={Number(revenueData.growth_rate || 0) > 0 ? '+' : ''}
            positive={Number(revenueData.growth_rate || 0) > 0}
          />
        </div>
      ) : null}

      {/* Chart Section */}
      {showChart && (
        <Card className="mb-6">
          <h3 className="text-lg font-semibold mb-4">Revenue Trend</h3>
          <div className="h-96 flex items-center justify-center bg-gray-50 rounded">
            <p className="text-gray-500">Chart visualization will be displayed here</p>
          </div>
        </Card>
      )}

      {/* Top Customers & Services */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Customers by Revenue */}
        <Card>
          <h3 className="text-lg font-semibold mb-4">Top 10 Customers</h3>
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, idx) => (
                <Skeleton key={idx} height="h-12" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {topCustomers.length === 0 ? (
                <p className="text-sm text-gray-500">No data for selected period.</p>
              ) : (
                topCustomers.map((customer, idx) => (
                  <div
                    key={customer.id || idx}
                    className="flex items-center justify-between pb-3 border-b border-gray-100 last:border-b-0"
                  >
                    <div>
                      <p className="font-medium text-sm">{customer.name}</p>
                      <p className="text-xs text-gray-600">{customer.invoice_count} invoices</p>
                    </div>
                    <p className="font-semibold">{formatCurrency(customer.total_revenue)}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </Card>

        {/* Revenue by Service Type */}
        <Card>
          <h3 className="text-lg font-semibold mb-4">Revenue by Service</h3>
          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, idx) => (
                <Skeleton key={idx} height="h-12" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {revenueByService.length === 0 ? (
                <p className="text-sm text-gray-500">No data for selected period.</p>
              ) : (
                revenueByService.map((service, idx) => {
                  const share = (Number(service.revenue || 0) / totalRevenue) * 100
                  return (
                    <div key={service.service_type || idx} className="pb-3 border-b border-gray-100 last:border-b-0">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-sm">{service.service_type}</p>
                        <p className="font-semibold">{formatCurrency(service.revenue)}</p>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${Math.min(share, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{share.toFixed(1)}% of total</p>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </Card>
      </div>
    </MainLayout>
  )
}

export default RevenueAnalyticsPage
