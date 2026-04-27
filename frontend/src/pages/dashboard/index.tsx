import { Link } from 'react-router-dom'
import { useDashboardSummary } from '@/hooks/use-dashboard'

function StatCard({
  label,
  value,
  sub,
  to,
  colorClass = '',
}: {
  label: string
  value: number | string
  sub?: string
  to?: string
  colorClass?: string
}) {
  const inner = (
    <div className={`rounded-lg border bg-card p-4 space-y-1 ${to ? 'hover:bg-muted/30 transition-colors' : ''}`}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
  return to ? <Link to={to}>{inner}</Link> : inner
}

function SectionHeader({ title, to, linkLabel }: { title: string; to: string; linkLabel: string }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-base font-semibold">{title}</h2>
      <Link to={to} className="text-xs text-primary hover:underline">
        {linkLabel} →
      </Link>
    </div>
  )
}

export function DashboardPage() {
  const { data, isLoading, isError } = useDashboardSummary()

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">読み込み中...</div>
  }

  if (isError || !data) {
    return <div className="p-8 text-center text-red-600">ダッシュボードデータの取得に失敗しました</div>
  }

  const { incidents, service_requests, change_requests } = data

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
        <p className="text-sm text-muted-foreground mt-1">ITIL管理システム — 全体概要</p>
      </div>

      {/* Incidents */}
      <div className="space-y-3">
        <SectionHeader title="インシデント管理" to="/incidents" linkLabel="一覧を見る" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="合計"
            value={incidents.total}
            to="/incidents"
          />
          <StatCard
            label="対応中"
            value={incidents.open}
            colorClass={incidents.open > 0 ? 'text-orange-600' : ''}
            to="/incidents?status=new"
          />
          <StatCard
            label="解決済み"
            value={incidents.resolved}
            colorClass="text-green-600"
            to="/incidents?status=resolved"
          />
          <StatCard
            label="クローズ"
            value={incidents.closed}
            to="/incidents?status=closed"
          />
        </div>

        {/* Priority breakdown */}
        <div className="grid grid-cols-4 gap-2">
          <StatCard
            label="P1 緊急"
            value={incidents.by_priority.p1_critical}
            colorClass={incidents.by_priority.p1_critical > 0 ? 'text-red-600' : ''}
          />
          <StatCard
            label="P2 高"
            value={incidents.by_priority.p2_high}
            colorClass={incidents.by_priority.p2_high > 0 ? 'text-orange-500' : ''}
          />
          <StatCard
            label="P3 中"
            value={incidents.by_priority.p3_medium}
            colorClass="text-yellow-600"
          />
          <StatCard
            label="P4 低"
            value={incidents.by_priority.p4_low}
            colorClass="text-slate-500"
          />
        </div>
      </div>

      {/* Service Requests */}
      <div className="space-y-3">
        <SectionHeader title="サービスリクエスト" to="/service-requests" linkLabel="一覧を見る" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="合計"
            value={service_requests.total}
            to="/service-requests"
          />
          <StatCard
            label="処理中"
            value={service_requests.open}
            colorClass={service_requests.open > 0 ? 'text-blue-600' : ''}
            to="/service-requests?status=in_progress"
          />
          <StatCard
            label="承認待ち"
            value={service_requests.approved}
            colorClass={service_requests.approved > 0 ? 'text-yellow-600' : ''}
            to="/service-requests?status=approved"
          />
          <StatCard
            label="完了"
            value={service_requests.completed}
            colorClass="text-green-600"
            to="/service-requests?status=completed"
          />
        </div>
      </div>

      {/* Change Requests */}
      <div className="space-y-3">
        <SectionHeader title="変更管理" to="/change-requests" linkLabel="一覧を見る" />
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <StatCard
            label="合計"
            value={change_requests.total}
            to="/change-requests"
          />
          <StatCard
            label="下書き"
            value={change_requests.draft}
            to="/change-requests?status=draft"
          />
          <StatCard
            label="レビュー中"
            value={change_requests.in_review}
            colorClass={change_requests.in_review > 0 ? 'text-yellow-600' : ''}
            to="/change-requests?status=under_review"
          />
          <StatCard
            label="実施中"
            value={change_requests.in_progress}
            colorClass={change_requests.in_progress > 0 ? 'text-blue-600' : ''}
            to="/change-requests?status=in_progress"
          />
          <StatCard
            label="完了"
            value={change_requests.completed}
            colorClass="text-green-600"
            to="/change-requests?status=completed"
          />
        </div>
      </div>
    </div>
  )
}
