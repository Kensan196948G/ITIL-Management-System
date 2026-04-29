import { useState } from 'react'
import { useAuditLogs } from '@/hooks/use-users'

const TABLE_OPTIONS = [
  { value: '', label: 'すべて' },
  { value: 'incidents', label: 'インシデント' },
  { value: 'service_requests', label: 'サービスリクエスト' },
  { value: 'change_requests', label: '変更リクエスト' },
  { value: 'users', label: 'ユーザー' },
]

const ACTION_OPTIONS = [
  { value: '', label: 'すべて' },
  { value: 'CREATE', label: '作成' },
  { value: 'UPDATE', label: '更新' },
  { value: 'DELETE', label: '削除' },
]

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-800',
  UPDATE: 'bg-blue-100 text-blue-800',
  DELETE: 'bg-red-100 text-red-800',
}

export function AuditLogsPage() {
  const [tableName, setTableName] = useState('')
  const [action, setAction] = useState('')
  const [page, setPage] = useState(1)

  const { data: logs, isLoading, isError } = useAuditLogs({
    table_name: tableName || undefined,
    action: action || undefined,
    page,
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">監査ログ</h1>
        <span className="text-sm text-muted-foreground">ITIL準拠の変更追跡記録</span>
      </div>

      <div className="flex gap-4 rounded-lg border bg-card p-4">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">対象テーブル</label>
          <select
            value={tableName}
            onChange={(e) => { setTableName(e.target.value); setPage(1) }}
            className="rounded border px-3 py-1.5 text-sm bg-background"
          >
            {TABLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">操作種別</label>
          <select
            value={action}
            onChange={(e) => { setAction(e.target.value); setPage(1) }}
            className="rounded border px-3 py-1.5 text-sm bg-background"
          >
            {ACTION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-8 text-muted-foreground">読み込み中...</div>
      )}

      {isError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          監査ログの取得に失敗しました。
        </div>
      )}

      {logs && (
        <>
          <div className="rounded-lg border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">日時</th>
                  <th className="px-4 py-3 text-left font-medium">テーブル</th>
                  <th className="px-4 py-3 text-left font-medium">レコードID</th>
                  <th className="px-4 py-3 text-left font-medium">操作</th>
                  <th className="px-4 py-3 text-left font-medium">ユーザーID</th>
                  <th className="px-4 py-3 text-left font-medium">変更内容</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      監査ログが見つかりません
                    </td>
                  </tr>
                )}
                {logs.map((log) => (
                  <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30 font-mono text-xs">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('ja-JP')}
                    </td>
                    <td className="px-4 py-3">{log.table_name}</td>
                    <td className="px-4 py-3 text-muted-foreground truncate max-w-[120px]" title={log.record_id}>
                      {log.record_id.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          ACTION_COLORS[log.action] ?? 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground truncate max-w-[120px]" title={log.user_id ?? ''}>
                      {log.user_id ? log.user_id.slice(0, 8) + '...' : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground truncate max-w-[200px]">
                      {log.changes ? JSON.stringify(log.changes).slice(0, 60) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>ページ {page} — {logs.length}件</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded border px-3 py-1 hover:bg-muted disabled:opacity-50"
              >
                前へ
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={logs.length < 50}
                className="rounded border px-3 py-1 hover:bg-muted disabled:opacity-50"
              >
                次へ
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
