import React, { useState } from 'react'
import { Card, Input, Button, Alert } from '../common'
import { useApi } from '../../hooks/useApi'
import rateCardService from '../../services/rateCardService'

/**
 * Billing Simulator Component
 */
const BillingSimulator = ({ customerId, rateCard }) => {
  const [duration, setDuration] = useState(65)
  const [showResults, setShowResults] = useState(false)

  const {
    data: simulation,
    loading,
    error,
    execute: simulate,
  } = useApi(
    () =>
      rateCardService.simulateBilling(customerId, {
        duration_seconds: Number(duration) || 0,
        service_type: rateCard.service_type,
        call_date: new Date().toISOString().split('T')[0],
      }),
    false
  )

  const handleSimulate = async () => {
    try {
      await simulate()
      setShowResults(true)
    } catch (err) {
      console.error('Simulation failed', err)
      setShowResults(false)
    }
  }

  const formatCurrency = (value) => `$${Number(value || 0).toFixed(4)}`

  return (
    <div className="space-y-6">
      <Card className="bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-gray-900 mb-4">Billing Simulator</h3>

        <div className="space-y-4">
          <Input
            label="Call Duration (seconds)"
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            min="1"
            placeholder="65"
          />

          <Button
            onClick={handleSimulate}
            loading={loading}
            disabled={loading}
            fullWidth
          >
            Simulate Billing
          </Button>
        </div>

        {error && (
          <Alert
            type="error"
            title="Simulation failed"
            message={error}
            className="mt-4"
            dismissible={false}
          />
        )}
      </Card>

      {showResults && simulation && (
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Simulation Results</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Input */}
            <div>
              <h4 className="font-medium text-sm text-gray-600 mb-3">Input</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Actual Duration:</span>
                  <span className="font-semibold">{duration} seconds</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Service Type:</span>
                  <span className="font-semibold">{rateCard.service_type}</span>
                </div>
              </div>
            </div>

            {/* Charges */}
            <div>
              <h4 className="font-medium text-sm text-gray-600 mb-3">Charges</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Billable Seconds:</span>
                  <span className="font-semibold">
                    {simulation.charge_details?.billableSeconds} seconds
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Billable Minutes:</span>
                  <span className="font-semibold">
                    {simulation.charge_details?.billableMinutes} minutes
                  </span>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="md:col-span-2 border-t border-gray-200 pt-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Usage Charge:</span>
                  <span>{formatCurrency(simulation.charge_details?.usageCharge)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Connection Fee:</span>
                  <span>{formatCurrency(simulation.charge_details?.connectionFee)}</span>
                </div>
                <div className="flex justify-between font-semibold text-base pt-2 border-t border-gray-200">
                  <span>Total Charge:</span>
                  <span className="text-primary">
                    {formatCurrency(simulation.charge_details?.totalCharge)}
                  </span>
                </div>
              </div>

              {simulation.sufficient_balance === false && (
                <Alert
                  type="warning"
                  title="Insufficient Balance"
                  message="Customer does not have enough balance to cover this call."
                  className="mt-4"
                  dismissible={false}
                />
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

export default BillingSimulator
