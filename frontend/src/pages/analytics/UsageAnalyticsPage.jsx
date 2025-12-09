import React, { useEffect, useMemo, useState } from 'react'
import { PhoneOff, Clock, Activity } from 'lucide-react'
import MainLayout from '../../components/layout/MainLayout'
import Header from '../../components/layout/Header'
import { Card, Select, Skeleton, DataTable, Badge } from '../../components/common'
import { useApi } from '../../hooks/useApi'
import StatCard from '../../components/dashboard/StatCard'
import adminService from '../../services/adminService'

/**
 * Usage Analytics Page
 */
const UsageAnalyticsPage = () => {
  const [period, setPeriod] = useState('30')

  const {
    data: usageData,
    loading,
    execute: fetchUsage,
  } = useApi(() => adminService.getUsageAnalytics(period), false)

  useEffect(() => {
    fetchUsage()
  }, [period, fetchUsage])

  const periods = useMemo(() => ([
    { value: '7', label: 'Last 7 Days' },
    { value: '30', label: 'Last 30 Days' },
    { value: '90', label: 'Last 90 Days' },
  ]), [])

  const formatDuration = (seconds = 0) => {
    const totalSeconds = Number(seconds || 0)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const secs = Math.floor(totalSeconds % 60)

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`
    }
    return `${secs}s`
  }

  const columns = useMemo(() => ([
    { key: 'customer_name', label: 'Customer' },
    {
      key: 'total_calls',
      label: 'Calls',
      render: (v) => Number(v || 0).toLocaleString(),
    },
    {
      key: 'total_duration',
      label: 'Duration',
      render: (v) => formatDuration(v),
    },
    {
      key: 'service_type',
      label: 'Service',
      render: (v) => <Badge variant="primary">{v}</Badge>,
    },
    {
      key: 'avg_call_duration',
      label: 'Avg Call',
      render: (v) => formatDuration(v),
    },
  ]), [])

  return (
    <MainLayout>
      <Header
        title="Usage Analytics"
        description="Track call volume and usage patterns"
        breadcrumbs={['Analytics', 'Usage']}
      />

      {/* Period Selector */}
      <Card className="mb-6">
        <div className="w-full md:w-48">
          <Select
            label="Time Period"
            options={periods}
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          />
        </div>
      </Card>

      {/* Key Metrics */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {[...Array(4)].map((_, idx) => (
            <Skeleton key={idx} height="h-24" />
          ))}
        </div>
      ) : usageData ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <StatCard
            title="Total Calls"
            value={Number(usageData.total_calls || 0).toLocaleString()}
            icon={PhoneOff}
            backgroundColor="bg-blue-50"
            iconColor="text-blue-600"
          />

          <StatCard
            title="Total Duration"
            value={formatDuration(usageData.total_duration_seconds)}
            icon={Clock}
            backgroundColor="bg-purple-50"
            iconColor="text-purple-600"
          />

          <StatCard
            title="Avg Call Duration"
            value={formatDuration(usageData.avg_call_duration)}
            icon={Activity}
            backgroundColor="bg-orange-50"
            iconColor="text-orange-600"
          />

          <StatCard
            title="Peak Hour Calls"
            value={Number(usageData.peak_hour_calls || 0).toLocaleString()}
            icon={Activity}
            backgroundColor="bg-red-50"
            iconColor="text-red-600"
          />
        </div>
      ) : null}

      {/* Usage by Service Type & Peak Hours */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* By Service Type */}
        <Card>
          <h3 className="text-lg font-semibold mb-4">Usage by Service</h3>
          {loading ? (
            <Skeleton height="h-32" />
          ) : (
            <div className="space-y-3">
              {(usageData?.by_service_type || []).length === 0 ? (
                <p className="text-sm text-gray-500">No usage data available.</p>
              ) : (
                usageData.by_service_type.map((service, idx) => (
                  <div key={service.service_type || idx} className="pb-3 border-b border-gray-100 last:border-b-0">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-sm">{service.service_type}</p>
                      <p className="font-semibold">{Number(service.call_count || 0).toLocaleString()} calls</p>
                    </div>
                    <p className="text-xs text-gray-600">
                      Duration: {formatDuration(service.total_duration)}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </Card>

        {/* Peak Times */}
        <Card>
          <h3 className="text-lg font-semibold mb-4">Peak Usage Hours</h3>
          {loading ? (
            <Skeleton height="h-32" />
          ) : (
            <div className="space-y-2">
              {(usageData?.peak_hours || []).length === 0 ? (
                <p className="text-sm text-gray-500">No peak hour data available.</p>
              ) : (
                usageData.peak_hours.map((hour, idx) => {
                  const maxCalls = usageData.peak_hours?.[0]?.calls || 1
                  const percentage = (Number(hour.calls || 0) / Number(maxCalls)) * 100
                  return (
                    <div
                      key={`${hour.hour}-${idx}`}
                      className="flex items-center justify-between pb-2 border-b border-gray-100 last:border-b-0"
                    >
                      <p className="text-sm">{hour.hour}:00 - {hour.hour}:59</p>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded h-2">
                          <div
                            className="bg-primary h-2 rounded"
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                        <p className="font-semibold text-sm w-12 text-right">
                          {hour.calls}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Top Customers by Usage */}
      <Card>
        <h3 className="text-lg font-semibold mb-4">Top Customers by Usage</h3>
        <DataTable
          columns={columns}
          data={usageData?.top_customers || []}
          loading={loading}
          emptyMessage="No usage data found"
        />
      </Card>
    </MainLayout>
  )
}

export default UsageAnalyticsPage
