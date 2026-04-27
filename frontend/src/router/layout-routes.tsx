import { Routes, Route } from 'react-router-dom'
import { AppLayout } from '@/components/layout/app-layout'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { DashboardPage } from '@/pages/dashboard'
import { IncidentListPage } from '@/pages/incidents/list'
import { CreateIncidentPage } from '@/pages/incidents/create'
import { IncidentDetailPage } from '@/pages/incidents/detail'
import { ServiceRequestListPage } from '@/pages/service-requests/list'
import { CreateServiceRequestPage } from '@/pages/service-requests/create'
import { ServiceRequestDetailPage } from '@/pages/service-requests/detail'
import { ServiceCatalogPage } from '@/pages/service-requests/catalog'
import { ChangeRequestListPage } from '@/pages/change-requests/list'
import { CreateChangeRequestPage } from '@/pages/change-requests/create'
import { ChangeRequestDetailPage } from '@/pages/change-requests/detail'
import { ChangeScheduleCalendarPage } from '@/pages/change-requests/calendar'
import { ProblemListPage } from '@/pages/problems/list'
import { CreateProblemPage } from '@/pages/problems/create'
import { ProblemDetailPage } from '@/pages/problems/detail'
import { ApprovalsPage } from '@/pages/approvals'
import { AdminUsersPage } from '@/pages/admin/users'
import { AuditLogsPage } from '@/pages/admin/audit-logs'
import { AdminSLAPoliciesPage } from '@/pages/admin/sla-policies'
import { ProfilePage } from '@/pages/profile'
import { NotificationsPage } from '@/pages/notifications'


export function LayoutRoutes() {
  return (
    <ProtectedRoute>
      <AppLayout>
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
      </AppLayout>
    </ProtectedRoute>
  )
}
