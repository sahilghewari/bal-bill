import React, { useMemo, useState } from 'react'
import { User, Lock, Bell, LogOut } from 'lucide-react'
import MainLayout from '../../components/layout/MainLayout'
import Header from '../../components/layout/Header'
import { Card, Tabs, Button, Input, Alert } from '../../components/common'
import { useForm } from '../../hooks/useApi'
import { useAppContext } from '../../hooks/useAppContext'

/**
 * User Settings Page
 */
const UserSettingsPage = () => {
  const { user, logout, addNotification } = useAppContext()
  const [activeTab, setActiveTab] = useState(0)

  const profileInitialValues = useMemo(() => ({
    full_name: user?.full_name || user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  }), [user?.full_name, user?.name, user?.email, user?.phone])

  const {
    values: profileValues,
    errors: profileErrors,
    touched: profileTouched,
    loading: profileLoading,
    handleChange: profileHandleChange,
    handleBlur: profileHandleBlur,
    handleSubmit: profileHandleSubmit,
  } = useForm(
    profileInitialValues,
    async () => {
      addNotification({
        type: 'success',
        title: 'Success',
        message: 'Profile updated successfully',
      })
    },
    { enableReinitialize: true }
  )

  const {
    values: passwordValues,
    errors: passwordErrors,
    touched: passwordTouched,
    loading: passwordLoading,
    handleChange: passwordHandleChange,
    handleBlur: passwordHandleBlur,
    handleSubmit: passwordHandleSubmit,
    resetForm: resetPasswordForm,
  } = useForm(
    {
      current_password: '',
      new_password: '',
      confirm_password: '',
    },
    async (vals) => {
      if (vals.new_password !== vals.confirm_password) {
        throw new Error('Passwords do not match')
      }

      addNotification({
        type: 'success',
        title: 'Success',
        message: 'Password changed successfully',
      })
      resetPasswordForm()
    }
  )

  const [notifications, setNotifications] = useState({
    invoice_generated: true,
    payment_received: true,
    payment_failed: true,
    low_balance_alert: true,
    weekly_summary: false,
  })

  const handleNotificationToggle = (key) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const tabs = [
    {
      label: 'Profile',
      icon: User,
      content: (
        <Card>
          <form onSubmit={profileHandleSubmit} className="space-y-4">
            <Input
              label="Full Name"
              name="full_name"
              value={profileValues.full_name}
              onChange={profileHandleChange}
              onBlur={profileHandleBlur}
              error={profileErrors.full_name}
              touched={profileTouched.full_name}
              disabled={profileLoading}
            />

            <Input
              label="Email Address"
              type="email"
              name="email"
              value={profileValues.email}
              onChange={profileHandleChange}
              onBlur={profileHandleBlur}
              error={profileErrors.email}
              touched={profileTouched.email}
              disabled
            />

            <Input
              label="Phone Number"
              name="phone"
              value={profileValues.phone}
              onChange={profileHandleChange}
              onBlur={profileHandleBlur}
              error={profileErrors.phone}
              touched={profileTouched.phone}
              disabled={profileLoading}
            />

            <div className="flex gap-3 pt-4">
              <Button type="submit" loading={profileLoading} disabled={profileLoading}>
                Save Changes
              </Button>
            </div>
          </form>
        </Card>
      ),
    },
    {
      label: 'Password',
      icon: Lock,
      content: (
        <Card>
          <form onSubmit={passwordHandleSubmit} className="space-y-4">
            <Alert
              type="info"
              title="Security"
              message="Use a strong password with at least 8 characters, including uppercase, lowercase, numbers, and symbols."
              dismissible={false}
            />

            <Input
              label="Current Password"
              type="password"
              name="current_password"
              value={passwordValues.current_password}
              onChange={passwordHandleChange}
              onBlur={passwordHandleBlur}
              error={passwordErrors.current_password}
              touched={passwordTouched.current_password}
              disabled={passwordLoading}
              required
            />

            <Input
              label="New Password"
              type="password"
              name="new_password"
              value={passwordValues.new_password}
              onChange={passwordHandleChange}
              onBlur={passwordHandleBlur}
              error={passwordErrors.new_password}
              touched={passwordTouched.new_password}
              disabled={passwordLoading}
              required
            />

            <Input
              label="Confirm Password"
              type="password"
              name="confirm_password"
              value={passwordValues.confirm_password}
              onChange={passwordHandleChange}
              onBlur={passwordHandleBlur}
              error={passwordErrors.confirm_password}
              touched={passwordTouched.confirm_password}
              disabled={passwordLoading}
              required
            />

            <div className="flex gap-3 pt-4">
              <Button type="submit" loading={passwordLoading} disabled={passwordLoading}>
                Change Password
              </Button>
            </div>
          </form>
        </Card>
      ),
    },
    {
      label: 'Notifications',
      icon: Bell,
      content: (
        <Card>
          <div className="space-y-4">
            {Object.entries(notifications).map(([key, value]) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={() => handleNotificationToggle(key)}
                  className="rounded cursor-pointer"
                />
                <div>
                  <p className="font-medium text-sm">
                    {key.replace(/_/g, ' ').replace(/^[a-z]/, (c) => c.toUpperCase())}
                  </p>
                </div>
              </label>
            ))}

            <div className="pt-4 flex gap-3">
              <Button>Save Preferences</Button>
            </div>
          </div>
        </Card>
      ),
    },
  ]

  return (
    <MainLayout>
      <Header
        title="Settings"
        description="Manage your account and preferences"
        breadcrumbs={['Settings']}
      />

      <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <Card className="mt-6 border-red-200 bg-red-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Sign Out</h3>
            <p className="text-sm text-gray-600 mt-1">
              You will be logged out from this account
            </p>
          </div>
          <Button variant="danger" icon={LogOut} onClick={logout}>
            Logout
          </Button>
        </div>
      </Card>
    </MainLayout>
  )
}

export default UserSettingsPage
