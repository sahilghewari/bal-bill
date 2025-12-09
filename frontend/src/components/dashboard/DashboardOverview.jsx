import React, { useEffect } from 'react'
import {
  TrendingUp,
  Users,
  FileText,
  CreditCard,
  AlertCircle,
} from 'lucide-react'
import { useAppContext } from '../../hooks/useAppContext'
import Card from '../common/Card'
import Skeleton from '../common/Skeleton'
import StatCard from './StatCard'

const DashboardOverview = () => {
  const { dashboardData, dashboardLoading, dashboardError, fetchDashboardData } = useAppContext()

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  if (dashboardError) {
    return (
      <Card className="bg-danger/10 border-danger/30 text-danger">
        <div className="flex gap-3">
          <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold">Error Loading Dashboard</h3>
            <p className="text-sm mt-1">{dashboardError}</p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardLoading ? (
          <>
            <Skeleton height="h-24" />
            <Skeleton height="h-24" />
            <Skeleton height="h-24" />
            <Skeleton height="h-24" />
          </>
        ) : dashboardData ? (
          <>
            <StatCard
              title="Total Customers"
              value={dashboardData.customers?.total || 0}
              icon={Users}
              trend="+12%"
              positive
            />
            <StatCard
              title="Active Invoices"
              value={dashboardData.financials?.invoices || 0}
              icon={FileText}
              trend="+8%"
              positive
            />
            <StatCard
              title="Total Revenue"
              value={`$${(dashboardData.financials?.total_invoiced || 0).toFixed(2)}`}
              icon={TrendingUp}
              trend="+15%"
              positive
            />
            <StatCard
              title="Pending Payments"
              value={`$${(dashboardData.financials?.outstanding || 0).toFixed(2)}`}
              icon={CreditCard}
              trend="-5%"
              positive={false}
            />
          </>
        ) : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4">Revenue Trend</h3>
          {dashboardLoading ? (
            <Skeleton height="h-64" />
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              Chart will be displayed here
            </div>
          )}
        </Card>

        <Card>
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          {dashboardLoading ? (
            <Skeleton height="h-64" count={3} />
          ) : (
            <div className="space-y-3 text-sm">
              <p className="text-gray-500">No recent activity</p>
            </div>
          )}
        </Card>
      </div>

      <Card>
        <h3 className="text-lg font-semibold mb-4">Key Metrics</h3>
        {dashboardLoading ? (
          <Skeleton height="h-12" count={3} />
        ) : dashboardData ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-gray-600 text-sm">Average Invoice Value</p>
              <p className="text-2xl font-bold text-primary mt-1">
                ${(dashboardData.financials?.avg_invoice || 0).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Payment Success Rate</p>
              <p className="text-2xl font-bold text-success mt-1">
                {dashboardData.financials?.payment_success_rate || 0}%
              </p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Total CDRs This Month</p>
              <p className="text-2xl font-bold text-primary mt-1">
                {dashboardData.usage?.total_calls || 0}
              </p>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  )
}

export default DashboardOverview
