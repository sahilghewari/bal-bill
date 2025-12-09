import React, { useCallback, useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { Card, Button, Input, Modal, Alert, Skeleton } from '../common'
import { useAppContext } from '../../hooks/useAppContext'
import { useForm } from '../../hooks/useApi'
import customerService from '../../services/customerService'

/**
 * Customer Balance Management Section
 */
const CustomerBalanceSection = ({ customerId }) => {
  const { addNotification } = useAppContext()
  const [balance, setBalance] = useState(null)
  const [sectionLoading, setSectionLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)

  const fetchBalance = useCallback(async () => {
    try {
      setSectionLoading(true)
      setError(null)
      const data = await customerService.getBalance(customerId)
      setBalance(data)
    } catch (err) {
      setError(err?.error || 'Failed to fetch balance')
    } finally {
      setSectionLoading(false)
    }
  }, [customerId])

  const {
    values,
    errors,
    handleChange,
    handleSubmit,
    resetForm,
    loading: formLoading,
  } = useForm({ amount: '', description: '' }, async (formValues) => {
    const amount = parseFloat(formValues.amount)
    if (Number.isNaN(amount) || amount <= 0) {
      throw { message: 'Amount must be greater than zero' }
    }

    await customerService.addCredit(customerId, {
      amount,
      description: formValues.description,
    })

    addNotification({
      type: 'success',
      title: 'Success',
      message: 'Credit added successfully',
    })

    setShowModal(false)
    resetForm()
    fetchBalance()
  })

  useEffect(() => {
    fetchBalance()
  }, [fetchBalance])

  const getStatusColor = (status) => {
    const colors = {
      healthy: 'text-success bg-success/10',
      warning: 'text-warning bg-warning/10',
      critical: 'text-danger bg-danger/10',
    }
    return colors[status] || 'text-gray-600 bg-gray-100'
  }

  if (sectionLoading) {
    return (
      <Card>
        <Skeleton height="h-6" count={3} />
      </Card>
    )
  }

  const formId = `add-credit-form-${customerId}`
  const currency = balance?.currency || 'USD'

  return (
    <div className="space-y-6">
      {error && <Alert type="error" title="Error" message={error} />}

      {balance && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <p className="text-gray-600 text-sm">Current Balance</p>
            <p className="text-3xl font-bold text-primary mt-2">
              {currency} {Number(balance.current_balance || 0).toFixed(2)}
            </p>
          </Card>

          <Card>
            <p className="text-gray-600 text-sm">Status</p>
            <p className={`text-lg font-semibold mt-2 px-3 py-1 rounded-lg w-fit ${getStatusColor(balance.status)}`}>
              {balance.status || 'unknown'}
            </p>
          </Card>

          <Card>
            <p className="text-gray-600 text-sm">Recommendation</p>
            <p className="text-sm font-medium text-gray-900 mt-2">
              {balance.recommendation || 'No recommendations at this time'}
            </p>
          </Card>
        </div>
      )}

      <div>
        <Button icon={Plus} onClick={() => setShowModal(true)}>
          Add Credit
        </Button>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Add Credit"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" form={formId} loading={formLoading}>
              Add Credit
            </Button>
          </>
        }
      >
        {errors.general && (
          <Alert
            type="error"
            title="Error"
            message={errors.general}
            className="mb-4"
          />
        )}
        <form id={formId} onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Amount"
            type="number"
            name="amount"
            value={values.amount}
            onChange={handleChange}
            placeholder="0.00"
            step="0.01"
            min="0"
            required
          />
          <Input
            label="Description"
            name="description"
            value={values.description}
            onChange={handleChange}
            placeholder="e.g., Monthly prepaid recharge"
            as="textarea"
          />
        </form>
      </Modal>
    </div>
  )
}

export default CustomerBalanceSection
