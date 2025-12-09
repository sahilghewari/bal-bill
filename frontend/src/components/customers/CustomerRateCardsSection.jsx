import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit, Eye } from 'lucide-react'
import { Button, Badge, DataTable, Skeleton } from '../common'
import { useApi } from '../../hooks/useApi'
import rateCardService from '../../services/rateCardService'

/**
 * Customer Rate Cards Section
 */
const CustomerRateCardsSection = ({ customerId }) => {
  const navigate = useNavigate()
  const { data: rateCards, loading, execute: fetchRateCards } = useApi(
    () => rateCardService.getCustomerRateCards(customerId),
    false
  )

  useEffect(() => {
    if (customerId) {
      fetchRateCards()
    }
  }, [customerId, fetchRateCards])

  const columns = [
    {
      key: 'service_type',
      label: 'Service',
      render: (value) => <Badge variant="primary">{value}</Badge>,
    },
    {
      key: 'price_per_minute',
      label: 'Price/Min',
      render: (value) => `$${parseFloat(value).toFixed(4)}`,
    },
    {
      key: 'initial_block_seconds',
      label: 'Initial Block',
      render: (value) => `${value}s`,
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
      key: 'effective_date',
      label: 'Effective',
      render: (value) => new Date(value).toLocaleDateString(),
    },
    {
      key: 'id',
      label: 'Actions',
      render: (value) => (
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
        </div>
      ),
    },
  ]

  if (loading) {
    return <Skeleton height="h-64" />
  }

  const allRateCards = rateCards?.by_service_type
    ? Object.values(rateCards.by_service_type).flat()
    : []

  return (
    <div className="space-y-4">
      <Button
        icon={Plus}
        onClick={() => navigate(`/customers/${customerId}/rate-cards/create`)}
      >
        Add Rate Card
      </Button>

      <DataTable
        columns={columns}
        data={allRateCards}
        emptyMessage="No rate cards configured"
      />
    </div>
  )
}

export default CustomerRateCardsSection
