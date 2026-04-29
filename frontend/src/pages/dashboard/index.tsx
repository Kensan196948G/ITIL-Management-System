import { Link } from 'react-router-dom'
import { useDashboardSummary, useDashboardKPIs } from '@/hooks/use-dashboard'
import { client } from '@/api/client'

function StatCard({
  label,
  value,
  colorClass = 'text-gray-900',
}: {
  label: string
  value: number | undefined
  colorClass?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-2xl font-bold ${colorClass}`}>
        {value ?? '—'}
      </span>
    </div>
  )
}

function KPICard({
  label,
  value,
  unit,
  colorClass = 'text-gray-900',
}: {
  label: string
  value: number | null | undefined
  unit?: string
  colorClass?: string
}) {
  const display = value == null ? '—' : `${value}${unit ?? ''}`
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-2xl font-bold ${colorClass}`}>{display}</span>
    </div>
  )
}

function ModuleCard({
  title,
  href,
  children,
}: {
  title: string
  href: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
        <Link
          to={href}
          className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
        >
          一覧を見る →
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{children}</div>
    </div>
  )
}

async function downloadCSV(path: string, filename: string) {
  const resp = await client.get(path, { responseType: 'blob' })
  const url = URL.createObjectURL(resp.data as Blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function DashboardPage() {
  const { data, isLoading } = useDashboardSummary()
  const { data: kpis } = useDashboardKPIs()

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center text-gray-400">
        読み込み中...
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>

      <ModuleCard title="インシデント管理" href="/incidents">
        <StatCard label="合計" value={data?.incidents.total} />
        <StatCard
          label="対応中"
          value={data?.incidents.open}
          colorClass="text-red-600"
        />
        <StatCard label="保留中" value={data?.incidents.pending} colorClass="text-yellow-600" />
        <StatCard label="解決済み" value={data?.incidents.resolved} colorClass="text-green-600" />
      </ModuleCard>

      {data?.incidents && (
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            インシデント 優先度別（未解決）
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard
              label="P1 重大"
              value={data.incidents.by_priority.p1_critical}
              colorClass="text-red-700"
            />
            <StatCard
              label="P2 高"
              value={data.incidents.by_priority.p2_high}
              colorClass="text-orange-600"
            />
            <StatCard
              label="P3 中"
              value={data.incidents.by_priority.p3_medium}
              colorClass="text-yellow-600"
            />
            <StatCard
              label="P4 低"
              value={data.incidents.by_priority.p4_low}
              colorClass="text-green-600"
            />
          </div>
        </div>
      )}

      <ModuleCard title="サービスリクエスト管理" href="/service-requests">
        <StatCard label="合計" value={data?.service_requests.total} />
        <StatCard
          label="対応中"
          value={data?.service_requests.open}
          colorClass="text-blue-600"
        />
        <StatCard
          label="承認済み"
          value={data?.service_requests.approved}
          colorClass="text-green-600"
        />
        <StatCard label="完了" value={data?.service_requests.completed} colorClass="text-gray-600" />
      </ModuleCard>

      <ModuleCard title="変更管理" href="/change-requests">
        <StatCard label="合計" value={data?.change_requests.total} />
        <StatCard
          label="レビュー中"
          value={data?.change_requests.in_review}
          colorClass="text-yellow-600"
        />
        <StatCard
          label="承認済み"
          value={data?.change_requests.approved}
          colorClass="text-green-600"
        />
        <StatCard
          label="実施中"
          value={data?.change_requests.in_progress}
          colorClass="text-purple-600"
        />
      </ModuleCard>

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">レポートエクスポート</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => downloadCSV('/reports/incidents', 'incidents.csv')}
            className="rounded-md bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
          >
            インシデント CSV
          </button>
          <button
            onClick={() => downloadCSV('/reports/service-requests', 'service_requests.csv')}
            className="rounded-md bg-green-50 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100"
          >
            サービスリクエスト CSV
          </button>
          <button
            onClick={() => downloadCSV('/reports/change-requests', 'change_requests.csv')}
            className="rounded-md bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100"
          >
            変更申請 CSV
          </button>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">ITIL KPI</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <KPICard
            label="MTTR（平均解決時間）"
            value={kpis?.mttr_minutes}
            unit=" 分"
            colorClass="text-blue-600"
          />
          <KPICard
            label="SLA 違反率"
            value={kpis?.sla_breach_rate}
            unit=" %"
            colorClass={
              kpis?.sla_breach_rate != null && kpis.sla_breach_rate > 10
                ? 'text-red-600'
                : 'text-green-600'
            }
          />
          <KPICard
            label="変更成功率"
            value={kpis?.change_success_rate}
            unit=" %"
            colorClass="text-green-600"
          />
          <KPICard
            label="既知エラー数"
            value={kpis?.known_error_count}
            colorClass="text-orange-600"
          />
        </div>
        {kpis?.generated_at && (
          <p className="mt-4 text-xs text-gray-400">
            最終更新: {new Date(kpis.generated_at).toLocaleString('ja-JP')}
          </p>
        )}
      </div>
    </div>
  )
}
