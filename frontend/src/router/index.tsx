import { Routes, Route, Navigate } from 'react-router-dom'

function HomePage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground mb-4">
          ITIL Management System
        </h1>
        <p className="text-muted-foreground">
          インシデント管理・サービスリクエスト管理・変更管理システム
        </p>
      </div>
    </div>
  )
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
