import React from 'react'
import MainLayout from '../../components/layout/MainLayout'
import Header from '../../components/layout/Header'
import DashboardOverview from '../../components/dashboard/DashboardOverview'

/**
 * Dashboard Page
 */
const DashboardPage = () => {
  return (
    <MainLayout>
      <Header
        title="Dashboard"
        description="Welcome back! Here's your billing overview."
        breadcrumbs={['Dashboard']}
      />
      <DashboardOverview />
    </MainLayout>
  )
}

export default DashboardPage
