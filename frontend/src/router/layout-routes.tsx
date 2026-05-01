import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AppLayout } from '@/components/layout/app-layout'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { LoadingFallback } from '@/components/ui/loading'

const DashboardPage = lazy(() => import('@/pages/dashboard').then((m) => ({ default: m.DashboardPage })))
const IncidentListPage = lazy(() => import('@/pages/incidents/list').then((m) => ({ default: m.IncidentListPage })))
const CreateIncidentPage = lazy(() => import('@/pages/incidents/create').then((m) => ({ default: m.CreateIncidentPage })))
const IncidentDetailPage = lazy(() => import('@/pages/incidents/detail').then((m) => ({ default: m.IncidentDetailPage })))
const ServiceRequestListPage = lazy(() => import('@/pages/service-requests/list').then((m) => ({ default: m.ServiceRequestListPage })))
const CreateServiceRequestPage = lazy(() => import('@/pages/service-requests/create').then((m) => ({ default: m.CreateServiceRequestPage })))
const ServiceRequestDetailPage = lazy(() => import('@/pages/service-requests/detail').then((m) => ({ default: m.ServiceRequestDetailPage })))
const ServiceCatalogPage = lazy(() => import('@/pages/service-requests/catalog').then((m) => ({ default: m.ServiceCatalogPage })))
const ChangeRequestListPage = lazy(() => import('@/pages/change-requests/list').then((m) => ({ default: m.ChangeRequestListPage })))
const CreateChangeRequestPage = lazy(() => import('@/pages/change-requests/create').then((m) => ({ default: m.CreateChangeRequestPage })))
const ChangeRequestDetailPage = lazy(() => import('@/pages/change-requests/detail').then((m) => ({ default: m.ChangeRequestDetailPage })))
const ChangeScheduleCalendarPage = lazy(() => import('@/pages/change-requests/calendar').then((m) => ({ default: m.ChangeScheduleCalendarPage })))
const ProblemListPage = lazy(() => import('@/pages/problems/list').then((m) => ({ default: m.ProblemListPage })))
const CreateProblemPage = lazy(() => import('@/pages/problems/create').then((m) => ({ default: m.CreateProblemPage })))
const ProblemDetailPage = lazy(() => import('@/pages/problems/detail').then((m) => ({ default: m.ProblemDetailPage })))
const ApprovalsPage = lazy(() => import('@/pages/approvals').then((m) => ({ default: m.ApprovalsPage })))
const AdminUsersPage = lazy(() => import('@/pages/admin/users').then((m) => ({ default: m.AdminUsersPage })))
const AuditLogsPage = lazy(() => import('@/pages/admin/audit-logs').then((m) => ({ default: m.AuditLogsPage })))
const AdminSLAPoliciesPage = lazy(() => import('@/pages/admin/sla-policies').then((m) => ({ default: m.AdminSLAPoliciesPage })))
const ProfilePage = lazy(() => import('@/pages/profile').then((m) => ({ default: m.ProfilePage })))
const NotificationsPage = lazy(() => import('@/pages/notifications').then((m) => ({ default: m.NotificationsPage })))


export function LayoutRoutes() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/incidents" element={<IncidentListPage />} />
            <Route path="/incidents/new" element={<CreateIncidentPage />} />
            <Route path="/incidents/:id" element={<IncidentDetailPage />} />
            <Route path="/service-requests" element={<ServiceRequestListPage />} />
            <Route path="/service-requests/new" element={<CreateServiceRequestPage />} />
            <Route path="/service-requests/:id" element={<ServiceRequestDetailPage />} />
            <Route path="/change-requests" element={<ChangeRequestListPage />} />
            <Route path="/change-requests/new" element={<CreateChangeRequestPage />} />
            <Route path="/change-requests/calendar" element={<ChangeScheduleCalendarPage />} />
            <Route path="/change-requests/:id" element={<ChangeRequestDetailPage />} />
            <Route path="/problems" element={<ProblemListPage />} />
            <Route path="/problems/new" element={<CreateProblemPage />} />
            <Route path="/problems/:id" element={<ProblemDetailPage />} />
            <Route path="/service-catalog" element={<ServiceCatalogPage />} />
            <Route path="/approvals/*" element={<ApprovalsPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/audit-logs" element={<AuditLogsPage />} />
            <Route path="/admin/sla-policies" element={<AdminSLAPoliciesPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
          </Routes>
        </Suspense>
      </AppLayout>
    </ProtectedRoute>
  )
}
