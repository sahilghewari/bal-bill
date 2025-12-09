import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Eye, Edit, Trash2 } from 'lucide-react'
import MainLayout from '../../components/layout/MainLayout'
import Header from '../../components/layout/Header'
import { Card, Button, Badge, DataTable, Pagination, Alert } from '../../components/common'
import { usePaginatedApi } from '../../hooks/useApi'
import { useAppContext, useCustomerContext } from '../../hooks/useAppContext'
import customerService from '../../services/customerService'

/**
 * Customer List Page
 */
const CustomerListPage = () => {
  const navigate = useNavigate()
  const { addNotification } = useAppContext()
  const { deleteCustomer } = useCustomerContext()
  const {
    data,
    loading,
    page,
    pages,
    fetchData,
    goToPage,
    error,
  } = usePaginatedApi(customerService.getAllCustomers)

  useEffect(() => {
    fetchData(1, 20)
  }, [fetchData])

  const handleDelete = async (customerId) => {
    if (typeof window !== 'undefined' && !window.confirm('Are you sure you want to delete this customer?')) {
      return
    }

    try {
      await deleteCustomer(customerId)
      addNotification({
        type: 'success',
        title: 'Success',
        message: 'Customer deleted successfully',
      })
      fetchData(page, 20)
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: err?.error || 'Failed to delete customer',
      })
    }
  }

  const columns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email' },
    { key: 'country', label: 'Country' },
    { key: 'currency', label: 'Currency' },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <Badge variant={value === 'active' ? 'success' : 'gray'}>
          {value}
        </Badge>
      ),
    },
    {
      key: 'id',
      label: 'Actions',
      render: (value) => (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigate(`/customers/${value}`)}
            className="p-1 text-primary hover:bg-primary/10 rounded"
            title="View"
          >
            <Eye size={18} />
          </button>
          <button
            type="button"
            onClick={() => navigate(`/customers/${value}/edit`)}
            className="p-1 text-gray-600 hover:bg-gray-100 rounded"
            title="Edit"
          >
            <Edit size={18} />
          </button>
          <button
            type="button"
            onClick={() => handleDelete(value)}
            className="p-1 text-danger hover:bg-danger/10 rounded"
            title="Delete"
          >
            <Trash2 size={18} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <MainLayout>
      <Header
        title="Customers"
        description="Manage customer accounts and billing profiles"
        breadcrumbs={['Customers']}
        action={
          <Button icon={Plus} onClick={() => navigate('/customers/create')}>
            Add Customer
          </Button>
        }
      />

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
          emptyMessage="No customers found"
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

export default CustomerListPage
