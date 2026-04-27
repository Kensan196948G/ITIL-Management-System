import { Routes, Route } from 'react-router-dom'
import { AppLayout } from '@/components/layout/app-layout'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { IncidentListPage } from '@/pages/incidents/list'
import { CreateIncidentPage } from '@/pages/incidents/create'
import { IncidentDetailPage } from '@/pages/incidents/detail'
import { ServiceRequestListPage } from '@/pages/service-requests/list'
import { CreateServiceRequestPage } from '@/pages/service-requests/create'
import { ServiceRequestDetailPage } from '@/pages/service-requests/detail'
import { ChangeRequestListPage } from '@/pages/change-requests/list'
import { CreateChangeRequestPage } from '@/pages/change-requests/create'
import { ChangeRequestDetailPage } from '@/pages/change-requests/detail'

function StubPage({ title }: { title: string }) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-muted-foreground mt-2">このページは実装中です。</p>
    </div>
  )
}

export function LayoutRoutes() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <Routes>
          <Route path="/" element={<StubPage title="ダッシュボード" />} />
          <Route path="/incidents" element={<IncidentListPage />} />
          <Route path="/incidents/new" element={<CreateIncidentPage />} />
          <Route path="/incidents/:id" element={<IncidentDetailPage />} />
          <Route path="/service-requests" element={<ServiceRequestListPage />} />
          <Route path="/service-requests/new" element={<CreateServiceRequestPage />} />
          <Route path="/service-requests/:id" element={<ServiceRequestDetailPage />} />
          <Route path="/change-requests" element={<ChangeRequestListPage />} />
          <Route path="/change-requests/new" element={<CreateChangeRequestPage />} />
          <Route path="/change-requests/:id" element={<ChangeRequestDetailPage />} />
          <Route path="/service-catalog/*" element={<StubPage title="サービスカタログ" />} />
          <Route path="/approvals/*" element={<StubPage title="承認キュー" />} />
        </Routes>
      </AppLayout>
    </ProtectedRoute>
  )
}
