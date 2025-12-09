import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import MainLayout from '../../components/layout/MainLayout'
import Header from '../../components/layout/Header'
import { Card, Skeleton, Alert } from '../../components/common'
import CustomerForm from '../../components/customers/CustomerForm'
import { useAppContext, useCustomerContext } from '../../hooks/useAppContext'

/**
 * Edit Customer Page
 */
const EditCustomerPage = () => {
  const { customerId } = useParams()
  const navigate = useNavigate()
  const { addNotification } = useAppContext()
  const { fetchCustomer, updateCustomer, customerLoading } = useCustomerContext()
  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadCustomer = async () => {
      try {
        setLoading(true)
        const data = await fetchCustomer(customerId)
        setCustomer(data)
        setError(null)
      } catch (err) {
        setError(err?.error || 'Failed to load customer')
      } finally {
        setLoading(false)
      }
    }

    loadCustomer()
  }, [customerId, fetchCustomer])

  const handleSubmit = async (values) => {
    await updateCustomer(customerId, values)
    addNotification({
      type: 'success',
      title: 'Success',
      message: 'Customer updated successfully',
    })
    navigate(`/customers/${customerId}`)
  }

  if (loading) {
    return (
      <MainLayout>
        <Header title="Edit Customer" breadcrumbs={['Customers', 'Edit']} />
        <Card>
          <Skeleton height="h-96" />
        </Card>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <Header
        title={`Edit Customer: ${customer?.name || ''}`}
        breadcrumbs={['Customers', customer?.name || 'Customer', 'Edit']}
      />

      {error && (
        <Alert
          type="error"
          title="Error"
          message={error}
          className="mb-6"
          dismissible={false}
        />
      )}

      <Card>
        <CustomerForm
          key={customer?.id || 'edit'}
          initialData={customer}
          onSubmit={handleSubmit}
          loading={customerLoading}
          error={error}
        />
      </Card>
    </MainLayout>
  )
}

export default EditCustomerPage
