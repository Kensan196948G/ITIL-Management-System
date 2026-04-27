import { Routes, Route } from 'react-router-dom'
import { AppLayout } from '@/components/layout/app-layout'
import { ProtectedRoute } from '@/components/auth/protected-route'

// Stub page component for pages not yet implemented
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
          <Route path="/incidents/*" element={<StubPage title="インシデント管理" />} />
          <Route path="/service-requests/*" element={<StubPage title="サービスリクエスト" />} />
          <Route path="/service-catalog/*" element={<StubPage title="サービスカタログ" />} />
          <Route path="/change-requests/*" element={<StubPage title="変更管理" />} />
          <Route path="/approvals/*" element={<StubPage title="承認キュー" />} />
        </Routes>
      </AppLayout>
    </ProtectedRoute>
  )
}
