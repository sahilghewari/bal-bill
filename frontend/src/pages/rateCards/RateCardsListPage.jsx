import React, { useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, Edit, Trash2, Eye, Copy } from 'lucide-react'
import MainLayout from '../../components/layout/MainLayout'
import Header from '../../components/layout/Header'
import { Card, Button, Badge, DataTable, Skeleton, Alert } from '../../components/common'
import { useApi } from '../../hooks/useApi'
import { useAppContext } from '../../hooks/useAppContext'
import rateCardService from '../../services/rateCardService'

/**
 * Rate Cards List Page
 */
const RateCardsListPage = () => {
  const { customerId } = useParams()
  const navigate = useNavigate()
  const { addNotification } = useAppContext()

  const {
    data: rateCards,
    loading,
    error,
    execute: fetchRateCards,
  } = useApi(() => rateCardService.getCustomerRateCards(customerId), false)

  useEffect(() => {
    if (customerId) {
      fetchRateCards()
    }
  }, [customerId, fetchRateCards])

  const normalizedRateCards = useMemo(() => {
    if (!rateCards) return []
    if (Array.isArray(rateCards)) {
      return rateCards
    }
    if (rateCards.by_service_type) {
      return Object.values(rateCards.by_service_type).flat()
    }
    if (rateCards.data) {
      return rateCards.data
    }
    return []
  }, [rateCards])

  const handleDelete = async (rateCardId) => {
    if (!window.confirm('Are you sure you want to delete this rate card?')) {
      return
    }

    try {
      await rateCardService.deactivateRateCard(rateCardId)
      addNotification({
        type: 'success',
        title: 'Success',
        message: 'Rate card deleted successfully',
      })
      fetchRateCards()
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: err?.error || 'Failed to delete rate card',
      })
    }
  }

  const handleDuplicate = async (rateCard) => {
    try {
      await rateCardService.createRateCard({
        ...rateCard,
        id: undefined,
        effective_date: new Date().toISOString().split('T')[0],
      })
      addNotification({
        type: 'success',
        title: 'Success',
        message: 'Rate card duplicated successfully',
      })
      fetchRateCards()
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: err?.error || 'Failed to duplicate rate card',
      })
    }
  }

  const columns = [
    {
      key: 'service_type',
      label: 'Service',
      render: (value) => (
        <Badge variant="primary">{value}</Badge>
      ),
    },
    {
      key: 'price_per_minute',
      label: 'Price/Min',
      render: (value) => `$${Number(value || 0).toFixed(4)}`,
    },
    {
      key: 'initial_block_seconds',
      label: 'Initial Block',
      render: (value) => `${value}s`,
    },
    {
      key: 'next_block_seconds',
      label: 'Next Block',
      render: (value) => `${value}s`,
    },
    {
      key: 'connection_fee_flat',
      label: 'Connection Fee',
      render: (value) => `$${Number(value || 0).toFixed(4)}`,
    },
    {
      key: 'effective_date',
      label: 'Effective Date',
      render: (value) => new Date(value).toLocaleDateString(),
    },
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
      render: (value, row) => (
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/rate-cards/${value}`)}
            className="p-1 text-primary hover:bg-primary/10 rounded"
            title="View"
          >
            <Eye size={18} />
          </button>
          <button
            onClick={() => navigate(`/rate-cards/${value}/edit`)}
            className="p-1 text-gray-600 hover:bg-gray-100 rounded"
            title="Edit"
          >
            <Edit size={18} />
          </button>
          <button
            onClick={() => handleDuplicate(row)}
            className="p-1 text-gray-600 hover:bg-gray-100 rounded"
            title="Duplicate"
          >
            <Copy size={18} />
          </button>
          <button
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

  if (loading && normalizedRateCards.length === 0) {
    return (
      <MainLayout>
        <Header title="Rate Cards" />
        <Card>
          <Skeleton height="h-64" />
        </Card>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <Header
        title="Rate Cards"
        description="Manage pricing plans for this customer"
        breadcrumbs={['Customers', customerId, 'Rate Cards']}
        action={
          <Button
            icon={Plus}
            onClick={() => navigate(`/customers/${customerId}/rate-cards/create`)}
          >
            Add Rate Card
          </Button>
        }
      />

      {error && (
        <Alert type="error" title="Error" message={error} className="mb-6" />
      )}

      <Card>
        <DataTable
          columns={columns}
          data={normalizedRateCards}
          loading={loading}
          emptyMessage="No rate cards found"
        />
      </Card>
    </MainLayout>
  )
}

export default RateCardsListPage
