import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useIncidents } from '@/hooks/use-incidents'
import { StatusBadge, PriorityBadge } from '@/components/incidents/status-badge'
import type { IncidentStatus, IncidentPriority } from '@/types/incident'

const STATUS_OPTIONS: { value: IncidentStatus | ''; label: string }[] = [
  { value: '', label: 'すべて' },
  { value: 'new', label: '新規' },
  { value: 'assigned', label: '割り当て済み' },
  { value: 'in_progress', label: '対応中' },
  { value: 'pending', label: '保留中' },
  { value: 'resolved', label: '解決済み' },
  { value: 'closed', label: 'クローズ' },
]

const PRIORITY_OPTIONS: { value: IncidentPriority | ''; label: string }[] = [
  { value: '', label: 'すべて' },
  { value: 'p1_critical', label: 'P1 緊急' },
  { value: 'p2_high', label: 'P2 高' },
  { value: 'p3_medium', label: 'P3 中' },
  { value: 'p4_low', label: 'P4 低' },
]

export function IncidentListPage() {
  const [status, setStatus] = useState<IncidentStatus | ''>('')
  const [priority, setPriority] = useState<IncidentPriority | ''>('')
  const [page, setPage] = useState(1)

  const { data, isLoading, isError } = useIncidents({
    status: status || undefined,
    priority: priority || undefined,
    page,
    page_size: 20,
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">インシデント管理</h1>
        <Link
          to="/incidents/new"
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          + 新規作成
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-4 rounded-lg border bg-card p-4">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            ステータス
          </label>
          <select
            className="rounded border px-2 py-1 text-sm"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as IncidentStatus | '')
              setPage(1)
            }}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            優先度
          </label>
          <select
            className="rounded border px-2 py-1 text-sm"
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value as IncidentPriority | '')
              setPage(1)
            }}
          >
            {PRIORITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        {isLoading && (
          <div className="p-8 text-center text-muted-foreground">読み込み中...</div>
        )}
        {isError && (
          <div className="p-8 text-center text-red-600">データの取得に失敗しました</div>
        )}
        {data && (
          <>
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                    タイトル
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                    ステータス
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                    優先度
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                    作成日時
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      インシデントが見つかりません
                    </td>
                  </tr>
                ) : (
                  data.items.map((incident) => (
                    <tr key={incident.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                        {incident.id.slice(0, 8)}...
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/incidents/${incident.id}`}
                          className="font-medium hover:underline"
                        >
                          {incident.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={incident.status} />
                      </td>
                      <td className="px-4 py-3">
                        <PriorityBadge priority={incident.priority} />
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {new Date(incident.created_at).toLocaleDateString('ja-JP')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {data.total > 20 && (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <span className="text-sm text-muted-foreground">
                  全 {data.total} 件
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="rounded border px-3 py-1 text-sm disabled:opacity-50"
                  >
                    前へ
                  </button>
                  <span className="px-2 py-1 text-sm">{page}</span>
                  <button
                    disabled={page * 20 >= data.total}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded border px-3 py-1 text-sm disabled:opacity-50"
                  >
                    次へ
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
