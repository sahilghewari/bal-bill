import React, { useEffect } from 'react'
import { DataTable, Skeleton } from '../common'
import { useApi } from '../../hooks/useApi'
import customerService from '../../services/customerService'

/**
 * Customer History Section
 */
const CustomerHistorySection = ({ customerId }) => {
  const { data: history, loading, execute: fetchHistory } = useApi(
    () => customerService.getBalanceHistory(customerId, 1, 50),
    false
  )

  useEffect(() => {
    if (customerId) {
      fetchHistory()
    }
  }, [customerId, fetchHistory])

  const columns = [
    {
      key: 'transaction_type',
      label: 'Type',
      render: (value) => {
        const types = {
          call_deduction: '📞 Call Charge',
          credit_addition: '➕ Credit Added',
          payment: '💳 Payment',
          adjustment: '⚙️ Adjustment',
        }
        return types[value] || value
      },
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (value) => `$${Math.abs(parseFloat(value)).toFixed(4)}`,
    },
    {
      key: 'balance_before',
      label: 'Balance Before',
      render: (value) => `$${parseFloat(value).toFixed(4)}`,
    },
    {
      key: 'balance_after',
      label: 'Balance After',
      render: (value) => `$${parseFloat(value).toFixed(4)}`,
    },
    {
      key: 'description',
      label: 'Description',
    },
    {
      key: 'created_at',
      label: 'Date',
      render: (value) => new Date(value).toLocaleDateString(),
    },
  ]

  if (loading) {
    return <Skeleton height="h-64" />
  }

  return (
    <DataTable
      columns={columns}
      data={history?.data || []}
      emptyMessage="No transaction history found"
    />
  )
}

export default CustomerHistorySection
