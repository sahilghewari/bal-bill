import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, Download, MoreVertical } from 'lucide-react'
import MainLayout from '../../components/layout/MainLayout'
import Header from '../../components/layout/Header'
import {
  Card,
  Button,
  Badge,
  DataTable,
  Pagination,
  Input,
  Select,
  Alert,
} from '../../components/common'
import { usePaginatedApi, useDebounce } from '../../hooks/useApi'
import { useAppContext } from '../../hooks/useAppContext'
import billingService from '../../services/billingService'

/**
 * Invoice List Page
 */
const InvoiceListPage = () => {
  const navigate = useNavigate()
  const { addNotification } = useAppContext()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [customerId, setCustomerId] = useState('')
  const debouncedSearch = useDebounce(search, 500)

  const invoiceFetcher = useCallback(
    (pg, limit) => billingService.getCustomerInvoices(customerId || null, {
      page: pg,
      limit,
      search: debouncedSearch,
      status: status || undefined,
    }),
    [customerId, debouncedSearch, status]
  )

  const {
    data,
    loading,
    page,
    pages,
    fetchData,
    goToPage,
    error,
  } = usePaginatedApi(invoiceFetcher)

  useEffect(() => {
    fetchData(1, 20)
  }, [invoiceFetcher, fetchData])

  const getStatusVariant = (invoiceStatus) => {
    const variants = {
      draft: 'gray',
      issued: 'info',
      paid: 'success',
      overdue: 'warning',
      cancelled: 'danger',
    }
    return variants[invoiceStatus] || 'gray'
  }

  const formatCurrency = (value, currency = 'USD') => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(value)

  const downloadInvoice = async (invoiceId) => {
    try {
      addNotification({
        type: 'info',
        title: `Invoice #${invoiceId}`,
        message: 'Your invoice PDF is being generated...',
      })
      // TODO: integrate actual download once backend endpoint is available
    } catch (err) {
      console.error('Failed to download invoice', err)
      addNotification({
        type: 'error',
        title: 'Error',
        message: err?.error || 'Failed to download invoice',
      })
    }
  }

  const columns = [
    {
      key: 'invoice_number',
      label: 'Invoice #',
      sortable: true,
      width: '120px',
    },
    {
      key: 'customer_name',
      label: 'Customer',
      render: (value, row) => (
        <div>
          <p className="font-medium">{row.customer_name}</p>
          <p className="text-xs text-gray-500">{row.customer_email}</p>
        </div>
      ),
    },
    {
      key: 'billing_period_start',
      label: 'Period',
      render: (value, row) => (
        <span className="text-sm">
          {new Date(value).toLocaleDateString()} - {new Date(row.billing_period_end).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'total_amount',
      label: 'Amount',
      render: (value, row) => (
        <span className="font-semibold">
          {formatCurrency(value, row.currency)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <Badge variant={getStatusVariant(value)}>{value}</Badge>
      ),
    },
    {
      key: 'due_date',
      label: 'Due Date',
      render: (value) => new Date(value).toLocaleDateString(),
    },
    {
      key: 'id',
      label: 'Actions',
      render: (value) => (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigate(`/invoices/${value}`)}
            className="p-1 text-primary hover:bg-primary/10 rounded"
            title="View Invoice"
          >
            <Eye size={18} />
          </button>
          <button
            type="button"
            onClick={() => downloadInvoice(value)}
            className="p-1 text-gray-600 hover:bg-gray-100 rounded"
            title="Download PDF"
          >
            <Download size={18} />
          </button>
          <button
            type="button"
            className="p-1 text-gray-600 hover:bg-gray-100 rounded"
            title="More actions"
          >
            <MoreVertical size={18} />
          </button>
        </div>
      ),
    },
  ]

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'draft', label: 'Draft' },
    { value: 'issued', label: 'Issued' },
    { value: 'paid', label: 'Paid' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'cancelled', label: 'Cancelled' },
  ]

  return (
    <MainLayout>
      <Header
        title="Invoices"
        description="View and manage billing invoices"
        breadcrumbs={['Billing', 'Invoices']}
        action={
          <Button onClick={() => navigate('/billing/generate-invoice')}>
            Generate Invoice
          </Button>
        }
      />

      <Card className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            placeholder="Search invoices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            options={statusOptions}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          />
          <Input
            placeholder="Filter by customer ID..."
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
          />
        </div>
      </Card>

      <Card>
        {error && (
          <Alert
            type="error"
            title="Error"
            message={error}
            className="mb-4"
            dismissible={false}
          />
        )}
        <DataTable
          columns={columns}
          data={data}
          loading={loading}
          emptyMessage="No invoices found"
        />

        {pages > 1 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <Pagination
              page={page}
              pages={pages}
              onPageChange={goToPage}
              isLoading={loading}
            />
          </div>
        )}
      </Card>
    </MainLayout>
  )
}

export default InvoiceListPage
