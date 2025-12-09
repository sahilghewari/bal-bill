import React from 'react'
import { useNavigate } from 'react-router-dom'
import MainLayout from '../../components/layout/MainLayout'
import Header from '../../components/layout/Header'
import { Card } from '../../components/common'
import CustomerForm from '../../components/customers/CustomerForm'
import { useAppContext, useCustomerContext } from '../../hooks/useAppContext'

/**
 * Create Customer Page
 */
const CreateCustomerPage = () => {
  const navigate = useNavigate()
  const { addNotification } = useAppContext()
  const { createCustomer, customerLoading, customerError } = useCustomerContext()

  const handleSubmit = async (values) => {
    const newCustomer = await createCustomer(values)
    addNotification({
      type: 'success',
      title: 'Success',
      message: `Customer "${newCustomer.name}" created successfully`,
    })
    navigate(`/customers/${newCustomer.id}`)
  }

  return (
    <MainLayout>
      <Header
        title="Create Customer"
        description="Add a new customer to the system"
        breadcrumbs={['Customers', 'Create']}
      />

      <Card>
        <CustomerForm
          onSubmit={handleSubmit}
          loading={customerLoading}
          error={customerError}
        />
      </Card>
    </MainLayout>
  )
}

export default CreateCustomerPage
