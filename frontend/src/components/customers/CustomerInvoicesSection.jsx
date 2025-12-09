import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, Download, XCircle } from 'lucide-react'
import { Button, Badge, DataTable, Skeleton } from '../common'
import { usePaginatedApi } from '../../hooks/useApi'
import billingService from '../../services/billingService'

/**
 * Customer Invoices Section
 */
const CustomerInvoicesSection = ({ customerId }) => {
  const navigate = useNavigate()
  const { data, loading, fetchData } = usePaginatedApi((pg, limit) =>
    billingService.getCustomerInvoices(customerId, { page: pg, limit })
  )

  useEffect(() => {
    if (customerId) {
      fetchData(1, 10)
    }
  }, [customerId, fetchData])

  const cancelInvoice = async (invoiceId) => {
    try {
      await billingService.cancelInvoice(invoiceId, { reason: 'Cancelled from customer view' })
      fetchData(1, 10)
    } catch (error) {
      console.error('Failed to cancel invoice', error)
    }
  }

  const columns = [
    { key: 'invoice_number', label: 'Invoice #' },
    {
      key: 'billing_period_start',
      label: 'Period',
      render: (value, row) =>
        `${new Date(value).toLocaleDateString()} - ${new Date(row.billing_period_end).toLocaleDateString()}`,
    },
    {
      key: 'total_amount',
      label: 'Amount',
      render: (value, row) =>
        new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: row.currency || 'USD',
        }).format(value),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => {
        const variants = {
          draft: 'gray',
          issued: 'info',
          paid: 'success',
          overdue: 'warning',
        }
        return <Badge variant={variants[value] || 'gray'}>{value}</Badge>
      },
    },
    {
      key: 'due_date',
      label: 'Due',
      render: (value) => new Date(value).toLocaleDateString(),
    },
    {
      key: 'id',
      label: 'Actions',
      render: (value) => (
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/invoices/${value}`)}
            className="p-1 text-primary hover:bg-primary/10 rounded"
            title="View"
          >
            <Eye size={18} />
          </button>
          <button
            className="p-1 text-gray-600 hover:bg-gray-100 rounded"
            title="Download"
          >
            <Download size={18} />
          </button>
          {['draft', 'issued', 'overdue'].includes(row.status) && (
            <button
              onClick={() => cancelInvoice(value)}
              className="p-1 text-danger hover:bg-danger/10 rounded"
              title="Cancel"
            >
              <XCircle size={18} />
            </button>
          )}
        </div>
      ),
    },
  ]

  if (loading) {
    return <Skeleton height="h-64" />
  }

  return (
    <div className="space-y-4">
      <Button onClick={() => navigate(`/billing/generate-invoice`)}>
        Generate Invoice
      </Button>

      <DataTable columns={columns} data={data} emptyMessage="No invoices found" />
    </div>
  )
}

export default CustomerInvoicesSection
