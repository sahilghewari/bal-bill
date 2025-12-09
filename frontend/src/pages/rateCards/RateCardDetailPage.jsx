import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Edit, Trash2, ArrowLeft } from 'lucide-react'
import MainLayout from '../../components/layout/MainLayout'
import Header from '../../components/layout/Header'
import { Card, Button, Badge, Skeleton, Alert } from '../../components/common'
import { useApi } from '../../hooks/useApi'
import { useAppContext } from '../../hooks/useAppContext'
import BillingSimulator from '../../components/rateCards/BillingSimulator'
import rateCardService from '../../services/rateCardService'

/**
 * Rate Card Detail Page
 */
const RateCardDetailPage = () => {
  const { rateCardId } = useParams()
  const navigate = useNavigate()
  const { addNotification } = useAppContext()
  const [deleting, setDeleting] = useState(false)

  const {
    data: rateCard,
    loading,
    error,
  } = useApi(() => rateCardService.getRateCardById(rateCardId), true, [rateCardId])

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this rate card?')) {
      return
    }

    try {
      setDeleting(true)
      await rateCardService.deactivateRateCard(rateCardId)
      addNotification({
        type: 'success',
        title: 'Success',
        message: 'Rate card deleted successfully',
      })
      navigate(-1)
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: err?.error || 'Failed to delete rate card',
      })
    } finally {
      setDeleting(false)
    }
  }

  if (loading && !rateCard) {
    return (
      <MainLayout>
        <Header title="Rate Card" />
        <Card>
          <Skeleton height="h-96" />
        </Card>
      </MainLayout>
    )
  }

  if (error || !rateCard) {
    return (
      <MainLayout>
        <Header title="Rate Card Not Found" />
        <Alert type="error" title="Error" message={error || 'Rate card not found'} />
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <Header
        title={`${rateCard.service_type} Rate Card`}
        breadcrumbs={['Rate Cards', rateCard.service_type]}
        action={
          <div className="flex gap-2">
            <Button variant="outline" icon={ArrowLeft} onClick={() => navigate(-1)}>
              Back
            </Button>
            <Button
              variant="outline"
              icon={Edit}
              onClick={() => navigate(`/rate-cards/${rateCardId}/edit`)}
            >
              Edit
            </Button>
            <Button variant="danger" icon={Trash2} loading={deleting} onClick={handleDelete}>
              Delete
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pricing Details */}
          <Card>
            <h3 className="text-lg font-semibold mb-6">Pricing Configuration</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600">Service Type</p>
                <p className="text-xl font-bold mt-2">
                  <Badge variant="primary">{rateCard.service_type}</Badge>
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className="text-xl font-bold mt-2">
                  <Badge variant={rateCard.status === 'active' ? 'success' : 'gray'}>
                    {rateCard.status}
                  </Badge>
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Price per Minute</p>
                <p className="text-xl font-bold mt-2">
                  ${Number(rateCard.price_per_minute || 0).toFixed(4)}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Connection Fee</p>
                <p className="text-xl font-bold mt-2">
                  ${Number(rateCard.connection_fee_flat || 0).toFixed(4)}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Initial Block</p>
                <p className="text-xl font-bold mt-2">
                  {rateCard.initial_block_seconds} seconds
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Next Block</p>
                <p className="text-xl font-bold mt-2">
                  {rateCard.next_block_seconds} seconds
                </p>
              </div>
            </div>
          </Card>

          {/* Billing Simulator */}
          <BillingSimulator customerId={rateCard.customer_id} rateCard={rateCard} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Dates */}
          <Card>
            <h3 className="font-semibold mb-4">Timeline</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-600">Effective Date</p>
                <p className="font-semibold">
                  {new Date(rateCard.effective_date).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Created</p>
                <p className="font-semibold">
                  {new Date(rateCard.created_at).toLocaleDateString()}
                </p>
              </div>
              {rateCard.deactivated_at && (
                <div>
                  <p className="text-gray-600">Deactivated</p>
                  <p className="font-semibold">
                    {new Date(rateCard.deactivated_at).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Rate Card ID */}
          <Card>
            <h3 className="font-semibold mb-4">Details</h3>
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-gray-600">ID</p>
                <p className="font-mono text-xs break-all">{rateCard.id}</p>
              </div>
              <div>
                <p className="text-gray-600">Customer ID</p>
                <p className="font-mono text-xs break-all">{rateCard.customer_id}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}

export default RateCardDetailPage
