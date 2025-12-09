import React from 'react'
import { Users, Layers } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import MainLayout from '../../components/layout/MainLayout'
import Header from '../../components/layout/Header'
import { Card, Button } from '../../components/common'

/**
 * Rate Cards Landing Page
 */
const RateCardsLandingPage = () => {
  const navigate = useNavigate()

  return (
    <MainLayout>
      <Header
        title="Rate Cards"
        description="Select a customer to configure custom pricing profiles, versions, and simulations."
        breadcrumbs={['Rate Cards']}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Users size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Manage Customer Rate Cards</h3>
              <p className="text-sm text-gray-600">
                Open any customer profile to review or update their assigned rate cards.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <Button onClick={() => navigate('/customers')} fullWidth>
              Go to Customers
            </Button>
          </div>
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
              <Layers size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">How to create a rate card</h3>
              <p className="text-sm text-gray-600">
                From a customer page, open the Rate Cards tab and click "Add Rate Card".
              </p>
            </div>
          </div>

          <ul className="list-disc pl-5 text-sm text-gray-600 space-y-2">
            <li>Define blocks, connection fees, and service type.</li>
            <li>Save versions to test new pricing structures safely.</li>
            <li>Use the billing simulator inside the rate card to verify charges.</li>
          </ul>
        </Card>
      </div>
    </MainLayout>
  )
}

export default RateCardsLandingPage
