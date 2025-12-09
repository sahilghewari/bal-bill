import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Edit, Trash2, CreditCard, History } from 'lucide-react'
import MainLayout from '../../components/layout/MainLayout'
import Header from '../../components/layout/Header'
import { Card, Button, Badge, Skeleton, Alert, Modal, Tabs } from '../../components/common'
import { useAppContext, useCustomerContext } from '../../hooks/useAppContext'
import CustomerBalanceSection from '../../components/customers/CustomerBalanceSection'
import CustomerRateCardsSection from '../../components/customers/CustomerRateCardsSection'
import CustomerInvoicesSection from '../../components/customers/CustomerInvoicesSection'
import CustomerHistorySection from '../../components/customers/CustomerHistorySection'

/**
 * Customer Detail Page
 */
const CustomerDetailPage = () => {
  const { customerId } = useParams()
  const navigate = useNavigate()
  const { addNotification } = useAppContext()
  const {
    selectedCustomer,
    customerLoading,
    customerError,
    fetchCustomer,
    deleteCustomer,
  } = useCustomerContext()
  const [deleteModal, setDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchCustomer(customerId)
  }, [customerId, fetchCustomer])

  const handleDelete = async () => {
    try {
      setDeleting(true)
      await deleteCustomer(customerId)
      addNotification({
        type: 'success',
        title: 'Success',
        message: 'Customer deleted successfully',
      })
      navigate('/customers')
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: error?.error || 'Failed to delete customer',
      })
    } finally {
      setDeleting(false)
      setDeleteModal(false)
    }
  }

  const getStatusVariant = (status) => {
    const variants = {
      active: 'success',
      inactive: 'gray',
      suspended: 'warning',
    }
    return variants[status] || 'gray'
  }

  if (customerLoading) {
    return (
      <MainLayout>
        <Header title="Loading..." breadcrumbs={['Customers']} />
        <Card>
          <Skeleton height="h-96" />
        </Card>
      </MainLayout>
    )
  }

  if (customerError || !selectedCustomer) {
    return (
      <MainLayout>
        <Header title="Customer Not Found" breadcrumbs={['Customers']} />
        <Alert
          type="error"
          title="Error"
          message={customerError || 'Customer not found'}
          dismissible={false}
        />
      </MainLayout>
    )
  }

  const stats = [
    {
      label: 'Status',
      value: (
        <Badge variant={getStatusVariant(selectedCustomer.status)}>
          {selectedCustomer.status}
        </Badge>
      ),
    },
    {
      label: 'Country',
      value: selectedCustomer.country || '—',
    },
    {
      label: 'Currency',
      value: selectedCustomer.currency || '—',
    },
    {
      label: 'Billing Day',
      value: selectedCustomer.billing_day ? `Day ${selectedCustomer.billing_day}` : '—',
    },
  ]

  return (
    <MainLayout>
      <Header
        title={selectedCustomer.name}
        description={selectedCustomer.email}
        breadcrumbs={['Customers', selectedCustomer.name]}
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              icon={Edit}
              onClick={() => navigate(`/customers/${customerId}/edit`)}
            >
              Edit
            </Button>
            <Button
              variant="danger"
              icon={Trash2}
              onClick={() => setDeleteModal(true)}
            >
              Delete
            </Button>
          </div>
        }
        stats={stats}
      />

      <Tabs
        tabs={[
          {
            label: 'Balance',
            icon: CreditCard,
            content: <CustomerBalanceSection customerId={customerId} />,
          },
          {
            label: 'Rate Cards',
            content: <CustomerRateCardsSection customerId={customerId} />,
          },
          {
            label: 'Invoices',
            content: <CustomerInvoicesSection customerId={customerId} />,
          },
          {
            label: 'History',
            icon: History,
            content: <CustomerHistorySection customerId={customerId} />,
          },
        ]}
      />

      <Modal
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        title="Delete Customer"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={deleting} onClick={handleDelete}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-gray-600">
          Are you sure you want to delete <strong>{selectedCustomer.name}</strong>?
        </p>
        <p className="text-sm text-gray-500 mt-2">
          This action cannot be undone and will remove all associated data.
        </p>
      </Modal>
    </MainLayout>
  )
}

export default CustomerDetailPage
