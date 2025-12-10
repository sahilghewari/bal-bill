import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import MainLayout from '../../components/layout/MainLayout'
import Header from '../../components/layout/Header'
import { Card } from '../../components/common'
import RateCardForm from '../../components/rateCards/RateCardForm'
import { useAppContext } from '../../hooks/useAppContext'
import rateCardService from '../../services/rateCardService'

/**
 * Create Rate Card Page
 */
const CreateRateCardPage = () => {
  const { customerId } = useParams()
  const navigate = useNavigate()
  const { addNotification } = useAppContext()
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const handleSubmit = async (values) => {
    try {
      setSubmitting(true)
      setSubmitError(null)
      const payload = {
        ...values,
        customer_id: values.customer_id || customerId,
      }

      if (!payload.currency) {
        delete payload.currency
      }

      await rateCardService.createRateCard(payload)
      addNotification({
        type: 'success',
        title: 'Success',
        message: 'Rate card created successfully',
      })
      navigate(`/customers/${customerId}/rate-cards`)
    } catch (error) {
      const message = error?.error || 'Failed to create rate card'
      setSubmitError(message)
      throw error
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <MainLayout>
      <Header
        title="Create Rate Card"
        description="Set up a new pricing plan for the customer"
        breadcrumbs={['Customers', customerId, 'Rate Cards', 'Create']}
      />

      <Card>
        <RateCardForm
          customerId={customerId}
          onSubmit={handleSubmit}
          loading={submitting}
          error={submitError}
        />
      </Card>
    </MainLayout>
  )
}

export default CreateRateCardPage
