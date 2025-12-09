import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import { CustomerProvider } from './context/CustomerContext'
import { BillingProvider } from './context/BillingContext'
import DashboardPage from './pages/dashboard/DashboardPage'
import CustomerListPage from './pages/customers/CustomerListPage'
import CreateCustomerPage from './pages/customers/CreateCustomerPage'
import EditCustomerPage from './pages/customers/EditCustomerPage'
import CustomerDetailPage from './pages/customers/CustomerDetailPage'
import InvoiceListPage from './pages/billing/InvoiceListPage'
import InvoiceDetailPage from './pages/billing/InvoiceDetailPage'
import GenerateInvoicePage from './pages/billing/GenerateInvoicePage'
import PaymentPage from './pages/payments/PaymentPage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import RevenueAnalyticsPage from './pages/analytics/RevenueAnalyticsPage'
import PaymentAnalyticsPage from './pages/analytics/PaymentAnalyticsPage'
import UsageAnalyticsPage from './pages/analytics/UsageAnalyticsPage'
import RateCardsListPage from './pages/rateCards/RateCardsListPage'
import CreateRateCardPage from './pages/rateCards/CreateRateCardPage'
import RateCardDetailPage from './pages/rateCards/RateCardDetailPage'
import RateCardsLandingPage from './pages/rateCards/RateCardsLandingPage'
import UserSettingsPage from './pages/settings/UserSettingsPage'

function App() {
  return (
    <Router>
      <AppProvider>
        <CustomerProvider>
          <BillingProvider>
            <Routes>
              <Route path="/customers" element={<CustomerListPage />} />
              <Route path="/customers/create" element={<CreateCustomerPage />} />
              <Route path="/customers/:customerId/edit" element={<EditCustomerPage />} />
              <Route path="/customers/:customerId" element={<CustomerDetailPage />} />
              <Route path="/customers/:customerId/rate-cards" element={<RateCardsListPage />} />
              <Route path="/customers/:customerId/rate-cards/create" element={<CreateRateCardPage />} />
              <Route path="/invoices" element={<InvoiceListPage />} />
              <Route path="/invoices/:invoiceId" element={<InvoiceDetailPage />} />
              <Route path="/billing/generate-invoice" element={<GenerateInvoicePage />} />
              <Route path="/payments/:invoiceId" element={<PaymentPage />} />
              <Route path="/analytics/revenue" element={<RevenueAnalyticsPage />} />
              <Route path="/analytics/payments" element={<PaymentAnalyticsPage />} />
              <Route path="/analytics/usage" element={<UsageAnalyticsPage />} />
              <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
              <Route path="/rate-cards" element={<RateCardsLandingPage />} />
              <Route path="/rate-cards/:rateCardId" element={<RateCardDetailPage />} />
              <Route path="/settings" element={<UserSettingsPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BillingProvider>
        </CustomerProvider>
      </AppProvider>
    </Router>
  )
}

export default App
