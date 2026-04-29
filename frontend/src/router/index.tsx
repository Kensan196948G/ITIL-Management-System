import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth-store'
import { LoginPage } from '@/pages/login'
import { RegisterPage } from '@/pages/register'
import { LayoutRoutes } from './layout-routes'

/** Redirect authenticated users away from auth pages */
function GuestRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}

export function AppRouter() {
  return (
    <Routes>
      {/* Public routes - no AppLayout */}
      <Route
        path="/login"
        element={
          <GuestRoute>
            <LoginPage />
          </GuestRoute>
        }
      />
      <Route
        path="/register"
        element={
          <GuestRoute>
            <RegisterPage />
          </GuestRoute>
        }
      />

      {/* Protected routes - with AppLayout via LayoutRoutes */}
      <Route path="/*" element={<LayoutRoutes />} />
    </Routes>
  )
}
