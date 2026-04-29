import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useProblems } from '@/hooks/use-problems'
import { ProblemStatusBadge, ProblemPriorityBadge } from '@/components/problems/status-badge'
import type { ProblemPriority, ProblemStatus } from '@/types/problem'

const STATUS_OPTIONS: { value: ProblemStatus | ''; label: string }[] = [
  { value: '', label: 'すべて' },
  { value: 'open', label: '未調査' },
  { value: 'under_investigation', label: '調査中' },
  { value: 'known_error', label: '既知エラー' },
  { value: 'resolved', label: '解決済み' },
  { value: 'closed', label: 'クローズ' },
]

const PRIORITY_OPTIONS: { value: ProblemPriority | ''; label: string }[] = [
  { value: '', label: 'すべて' },
  { value: 'p1_critical', label: 'P1 緊急' },
  { value: 'p2_high', label: 'P2 高' },
  { value: 'p3_medium', label: 'P3 中' },
  { value: 'p4_low', label: 'P4 低' },
]

export function ProblemListPage() {
  const [status, setStatus] = useState<ProblemStatus | ''>('')
  const [priority, setPriority] = useState<ProblemPriority | ''>('')
  const [isKnownError, setIsKnownError] = useState<boolean | undefined>(undefined)
  const [page, setPage] = useState(1)

  const { data, isLoading, isError } = useProblems({
    status: status || undefined,
    priority: priority || undefined,
    is_known_error: isKnownError,
    page,
    page_size: 20,
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">問題管理</h1>
        <Link
          to="/problems/new"
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          + 新規作成
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
              setStatus(e.target.value as ProblemStatus | '')
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
              setPriority(e.target.value as ProblemPriority | '')
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
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isKnownError === true}
              onChange={(e) => {
                setIsKnownError(e.target.checked ? true : undefined)
                setPage(1)
              }}
            />
            既知エラーのみ
          </label>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">タイトル</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">ステータス</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">優先度</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">既知エラー</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">作成日時</th>
                </tr>
              </thead>
              <tbody>
                {data.items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      問題が見つかりません
                    </td>
                  </tr>
                ) : (
                  data.items.map((problem) => (
                    <tr key={problem.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                        {problem.id.slice(0, 8)}...
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/problems/${problem.id}`}
                          className="font-medium hover:underline"
                        >
                          {problem.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <ProblemStatusBadge status={problem.status} />
                      </td>
                      <td className="px-4 py-3">
                        <ProblemPriorityBadge priority={problem.priority} />
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {problem.is_known_error && (
                          <span className="inline-flex items-center rounded-full bg-orange-100 text-orange-800 px-2 py-0.5 text-xs font-medium">
                            KEDB
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {new Date(problem.created_at).toLocaleDateString('ja-JP')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination */}
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
