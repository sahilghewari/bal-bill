import React, { useEffect, useMemo, useState } from 'react'
import { CheckCircle, AlertCircle, CreditCard } from 'lucide-react'
import MainLayout from '../../components/layout/MainLayout'
import Header from '../../components/layout/Header'
import { Card, Select, Skeleton, Badge, DataTable, Alert } from '../../components/common'
import { useApi } from '../../hooks/useApi'
import StatCard from '../../components/dashboard/StatCard'
import adminService from '../../services/adminService'

/**
 * Payment Analytics Page
 */
const PaymentAnalyticsPage = () => {
  const [period, setPeriod] = useState('30')

  const {
    data: paymentData,
    loading,
    error,
    execute: fetchPayments,
  } = useApi(() => adminService.getPaymentAnalytics(period), false)

  useEffect(() => {
    fetchPayments()
  }, [period, fetchPayments])

  const periods = useMemo(() => ([
    { value: '7', label: 'Last 7 Days' },
    { value: '30', label: 'Last 30 Days' },
    { value: '90', label: 'Last 90 Days' },
  ]), [])

  const formatCurrency = (value) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(value || 0))

  const columns = useMemo(() => ([
    { key: 'payment_date', label: 'Date', render: (v) => new Date(v).toLocaleDateString() },
    { key: 'customer_name', label: 'Customer' },
    { key: 'invoice_number', label: 'Invoice #' },
    {
      key: 'amount',
      label: 'Amount',
      render: (v) => formatCurrency(v),
    },
    {
      key: 'payment_method',
      label: 'Method',
      render: (v) => (
        <Badge variant="gray">
          {v === 'credit_card' ? '💳' : '🏦'} {v}
        </Badge>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (v) => (
        <Badge variant={v === 'success' ? 'success' : 'warning'}>
          {v}
        </Badge>
      ),
    },
  ]), [])

  return (
    <MainLayout>
      <Header
        title="Payment Analytics"
        description="Monitor payment performance and success rates"
        breadcrumbs={['Analytics', 'Payments']}
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

      {error && (
        <Alert type="error" title="Error" message={error} className="mb-6" />
      )}

      {/* Key Metrics */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {[...Array(4)].map((_, idx) => (
            <Skeleton key={idx} height="h-24" />
          ))}
        </div>
      ) : paymentData ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <StatCard
            title="Total Payments"
            value={formatCurrency(paymentData.total_payments)}
            icon={CreditCard}
            backgroundColor="bg-success/10"
            iconColor="text-success"
          />

          <StatCard
            title="Success Rate"
            value={`${Number(paymentData.success_rate || 0).toFixed(1)}%`}
            icon={CheckCircle}
            backgroundColor="bg-success/10"
            iconColor="text-success"
            positive
          />

          <StatCard
            title="Failed Payments"
            value={`${paymentData.failed_count || 0}`}
            icon={AlertCircle}
            backgroundColor="bg-danger/10"
            iconColor="text-danger"
          />

          <StatCard
            title="Avg Payment"
            value={formatCurrency(paymentData.average_payment)}
            icon={CreditCard}
            backgroundColor="bg-blue-50"
            iconColor="text-blue-600"
          />
        </div>
      ) : null}

      {/* Payment Methods Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* By Method */}
        <Card>
          <h3 className="text-lg font-semibold mb-4">Payments by Method</h3>
          {loading ? (
            <Skeleton height="h-32" />
          ) : (
            <div className="space-y-3">
              {(paymentData?.by_method || []).length === 0 ? (
                <p className="text-sm text-gray-500">No payment method data.</p>
              ) : (
                paymentData.by_method.map((method, idx) => (
                  <div
                    key={method.method || idx}
                    className="flex items-center justify-between pb-3 border-b border-gray-100 last:border-b-0"
                  >
                    <div>
                      <p className="font-medium text-sm">{method.method}</p>
                      <p className="text-xs text-gray-600">{method.count} transactions</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(method.total)}</p>
                      <p className="text-xs text-gray-500">
                        {((Number(method.total || 0) / Number(paymentData?.total_payments || 1)) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </Card>

        {/* Failure Reasons */}
        <Card>
          <h3 className="text-lg font-semibold mb-4">Failure Analysis</h3>
          {loading ? (
            <Skeleton height="h-32" />
          ) : (
            <div className="space-y-3">
              {(paymentData?.failure_reasons || []).length === 0 ? (
                <p className="text-sm text-gray-500">No failures reported.</p>
              ) : (
                paymentData.failure_reasons.map((reason, idx) => (
                  <div
                    key={reason.reason || idx}
                    className="flex items-center justify-between pb-3 border-b border-gray-100 last:border-b-0"
                  >
                    <p className="text-sm">{reason.reason}</p>
                    <Badge variant="danger">{reason.count}</Badge>
                  </div>
                ))
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Recent Payments */}
      <Card>
        <h3 className="text-lg font-semibold mb-4">Recent Payments</h3>
        <DataTable
          columns={columns}
          data={paymentData?.recent_payments || []}
          loading={loading}
          emptyMessage="No payments found"
        />
      </Card>
    </MainLayout>
  )
}

export default PaymentAnalyticsPage
