import React, { useCallback, useEffect, useState } from 'react'
import { Check, Plus, Trash2 } from 'lucide-react'
import { Card, Button, Modal, Alert, Skeleton } from '../common'
import { useAppContext } from '../../hooks/useAppContext'
import stripeService from '../../services/stripeService'
import AddPaymentMethodForm from './AddPaymentMethodForm'

/**
 * Payment Methods Manager Component
 */
const PaymentMethodsManager = ({ customerId }) => {
  const { addNotification } = useAppContext()
  const [paymentMethods, setPaymentMethods] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)

  const fetchPaymentMethods = useCallback(async () => {
    if (!customerId) {
      return
    }

    try {
      setLoading(true)
      setError(null)
      const methods = await stripeService.getPaymentMethods(customerId)
      setPaymentMethods(methods || [])
    } catch (err) {
      setError(err?.error || 'Failed to fetch payment methods')
    } finally {
      setLoading(false)
    }
  }, [customerId])

  useEffect(() => {
    fetchPaymentMethods()
  }, [fetchPaymentMethods])

  const handleDeleteMethod = async (methodId) => {
    if (typeof window !== 'undefined' && !window.confirm('Delete this payment method?')) {
      return
    }

    try {
      await stripeService.deletePaymentMethod(customerId, methodId)
      setPaymentMethods((prev) => prev.filter((method) => method.id !== methodId))
      addNotification({
        type: 'success',
        title: 'Payment method deleted',
        message: 'The method has been removed from this account.',
      })
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: err?.error || 'Failed to delete payment method',
      })
    }
  }

  const handleAddMethodSuccess = (method) => {
    setPaymentMethods((prev) => [method, ...prev])
    setShowAddModal(false)
  }

  if (!customerId) {
    return (
      <Alert
        type="warning"
        title="Customer required"
        message="Please select a customer to manage payment methods."
      />
    )
  }

  if (loading) {
    return <Skeleton height="h-32" count={3} />
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert type="error" title="Error" message={error} />
      )}

      <Button icon={Plus} onClick={() => setShowAddModal(true)}>
        Add Payment Method
      </Button>

      {paymentMethods.length === 0 ? (
        <Card>
          <div className="text-center py-8 text-gray-500">
            <p>No payment methods saved yet</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {paymentMethods.map((method) => (
            <Card key={method.id} hover>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-3xl">
                    {method.type === 'card' ? '💳' : '🏦'}
                  </div>
                  <div>
                    <p className="font-semibold">
                      {(method.card?.brand || 'Card').toUpperCase()}
                    </p>
                    <p className="text-sm text-gray-600">
                      •••• •••• •••• {method.card?.last4 || '0000'}
                    </p>
                    <p className="text-xs text-gray-500">
                      Expires {method.card?.exp_month}/{method.card?.exp_year}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {method.is_default && (
                    <span className="flex items-center gap-1 text-xs bg-success/10 text-success px-3 py-1 rounded-full">
                      <Check size={14} />
                      Default
                    </span>
                  )}
                  <button
                    onClick={() => handleDeleteMethod(method.id)}
                    className="p-2 text-danger hover:bg-danger/10 rounded"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Payment Method"
      >
        <AddPaymentMethodForm
          customerId={customerId}
          onSuccess={handleAddMethodSuccess}
          onClose={() => setShowAddModal(false)}
        />
      </Modal>
    </div>
  )
}

export default PaymentMethodsManager
