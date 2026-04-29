import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useServiceRequests } from '@/hooks/use-service-requests'
import {
  CATEGORY_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  type ServiceRequestCategory,
  type ServiceRequestStatus,
} from '@/types/service-request'

const STATUS_OPTIONS: { value: ServiceRequestStatus | ''; label: string }[] = [
  { value: '', label: 'すべて' },
  { value: 'submitted', label: '提出済み' },
  { value: 'pending_approval', label: '承認待ち' },
  { value: 'approved', label: '承認済み' },
  { value: 'rejected', label: '却下' },
  { value: 'in_progress', label: '対応中' },
  { value: 'completed', label: '完了' },
  { value: 'cancelled', label: 'キャンセル' },
]

const CATEGORY_OPTIONS: { value: ServiceRequestCategory | ''; label: string }[] = [
  { value: '', label: 'すべて' },
  { value: 'it_equipment', label: 'IT機器' },
  { value: 'software_access', label: 'ソフトウェアアクセス' },
  { value: 'network_access', label: 'ネットワークアクセス' },
  { value: 'user_account', label: 'ユーザーアカウント' },
  { value: 'other', label: 'その他' },
]

export function ServiceRequestListPage() {
  const [status, setStatus] = useState<ServiceRequestStatus | ''>('')
  const [category, setCategory] = useState<ServiceRequestCategory | ''>('')
  const [page, setPage] = useState(1)

  const { data, isLoading, isError } = useServiceRequests({
    status: status || undefined,
    category: category || undefined,
    page,
    page_size: 20,
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">サービスリクエスト管理</h1>
        <Link
          to="/service-requests/new"
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          + 新規リクエスト
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
              setStatus(e.target.value as ServiceRequestStatus | '')
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
            カテゴリ
          </label>
          <select
            className="rounded border px-2 py-1 text-sm"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as ServiceRequestCategory | '')
              setPage(1)
            }}
          >
            {CATEGORY_OPTIONS.map((o) => (
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
                    カテゴリ
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
                      サービスリクエストが見つかりません
                    </td>
                  </tr>
                ) : (
                  data.items.map((sr) => (
                    <tr key={sr.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                        {sr.id.slice(0, 8)}...
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/service-requests/${sr.id}`}
                          className="font-medium hover:underline"
                        >
                          {sr.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[sr.status]}`}
                        >
                          {STATUS_LABELS[sr.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {CATEGORY_LABELS[sr.category]}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {new Date(sr.created_at).toLocaleDateString('ja-JP')}
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
