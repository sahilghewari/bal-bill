import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { Input, Button, Alert, Card } from '../../components/common'
import { useForm } from '../../hooks/useApi'
import { useAppContext } from '../../hooks/useAppContext'

/**
 * Login Page
 */
const LoginPage = () => {
  const navigate = useNavigate()
  const { login } = useAppContext()
  const [error, setError] = useState(null)

  const {
    values,
    errors,
    touched,
    loading,
    handleChange,
    handleBlur,
    handleSubmit,
  } = useForm(
    { email: '', password: '' },
    async (vals) => {
      try {
        setError(null)

        const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: vals.email,
            password: vals.password,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data?.error || 'Login failed')
        }

        localStorage.setItem('authToken', data.token)
        login(data.user)
        navigate('/dashboard')
      } catch (err) {
        setError(err?.message || 'Login failed')
        throw err
      }
    }
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="bg-white p-3 rounded-lg">
              <LogIn size={32} className="text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white">Telecom Billing</h1>
          <p className="text-primary/80 mt-2">Admin Portal</p>
        </div>

        <Card className="shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert type="error" title="Login Failed" message={error} dismissible={false} />
            )}

            <Input
              label="Email Address"
              type="email"
              name="email"
              value={values.email}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.email}
              touched={touched.email}
              placeholder="admin@example.com"
              required
              disabled={loading}
            />

            <Input
              label="Password"
              type="password"
              name="password"
              value={values.password}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.password}
              touched={touched.password}
              placeholder="••••••••"
              required
              disabled={loading}
            />

            <Button type="submit" fullWidth loading={loading} disabled={loading}>
              Sign In
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-center">
              Demo credentials:
              <br />
              Email: admin@example.com
              <br />
              Password: password123
            </p>
          </div>
        </Card>

        <p className="text-center text-white/60 text-sm mt-6">
          © 2025 Telecom Billing System. All rights reserved.
        </p>
      </div>
    </div>
  )
}

export default LoginPage
