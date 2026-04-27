import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useChangeRequests } from '@/hooks/use-change-requests'
import {
  RISK_COLORS,
  STATUS_COLORS,
  STATUS_LABELS,
  TYPE_COLORS,
  TYPE_LABELS,
  type ChangeRequestRisk,
  type ChangeRequestStatus,
  type ChangeRequestType,
} from '@/types/change-request'

const STATUS_OPTIONS: { value: ChangeRequestStatus | ''; label: string }[] = [
  { value: '', label: 'すべて' },
  { value: 'draft', label: '下書き' },
  { value: 'submitted', label: '提出済み' },
  { value: 'under_review', label: 'レビュー中' },
  { value: 'approved', label: '承認済み' },
  { value: 'rejected', label: '却下' },
  { value: 'in_progress', label: '実施中' },
  { value: 'completed', label: '完了' },
  { value: 'failed', label: '失敗' },
  { value: 'cancelled', label: 'キャンセル' },
]

const TYPE_OPTIONS: { value: ChangeRequestType | ''; label: string }[] = [
  { value: '', label: 'すべて' },
  { value: 'standard', label: '標準変更' },
  { value: 'normal', label: '通常変更' },
  { value: 'emergency', label: '緊急変更' },
]

const RISK_OPTIONS: { value: ChangeRequestRisk | ''; label: string }[] = [
  { value: '', label: 'すべて' },
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
]

export function ChangeRequestListPage() {
  const [status, setStatus] = useState<ChangeRequestStatus | ''>('')
  const [changeType, setChangeType] = useState<ChangeRequestType | ''>('')
  const [riskLevel, setRiskLevel] = useState<ChangeRequestRisk | ''>('')
  const [page, setPage] = useState(1)

  const { data, isLoading, isError } = useChangeRequests({
    status: status || undefined,
    change_type: changeType || undefined,
    risk_level: riskLevel || undefined,
    page,
    page_size: 20,
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">変更管理</h1>
        <Link
          to="/change-requests/new"
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          + 変更申請
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 rounded-lg border bg-card p-4">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            ステータス
          </label>
          <select
            className="rounded border px-2 py-1 text-sm"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as ChangeRequestStatus | '')
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
            変更タイプ
          </label>
          <select
            className="rounded border px-2 py-1 text-sm"
            value={changeType}
            onChange={(e) => {
              setChangeType(e.target.value as ChangeRequestType | '')
              setPage(1)
            }}
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            リスクレベル
          </label>
          <select
            className="rounded border px-2 py-1 text-sm"
            value={riskLevel}
            onChange={(e) => {
              setRiskLevel(e.target.value as ChangeRequestRisk | '')
              setPage(1)
            }}
          >
            {RISK_OPTIONS.map((o) => (
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
                    変更タイプ
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                    リスク
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                    作成日時
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      変更申請が見つかりません
                    </td>
                  </tr>
                ) : (
                  data.items.map((cr) => (
                    <tr key={cr.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                        {cr.id.slice(0, 8)}...
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/change-requests/${cr.id}`}
                          className="font-medium hover:underline"
                        >
                          {cr.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[cr.status]}`}
                        >
                          {STATUS_LABELS[cr.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_COLORS[cr.change_type]}`}
                        >
                          {TYPE_LABELS[cr.change_type]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${RISK_COLORS[cr.risk_level]}`}
                        >
                          {cr.risk_level.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {new Date(cr.created_at).toLocaleDateString('ja-JP')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {data.total > 20 && (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <span className="text-sm text-muted-foreground">全 {data.total} 件</span>
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
