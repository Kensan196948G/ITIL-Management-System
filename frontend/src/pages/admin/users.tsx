import { useState } from 'react'
import { useUserList, useUpdateUser } from '@/hooks/use-users'

const ROLE_LABELS: Record<string, string> = {
  admin: '管理者',
  agent: 'エージェント',
  user: '一般ユーザー',
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-800',
  agent: 'bg-blue-100 text-blue-800',
  user: 'bg-gray-100 text-gray-800',
}

function RoleBadge({ role }: { role: string | null }) {
  const label = role ? (ROLE_LABELS[role] ?? role) : '未設定'
  const color = role ? (ROLE_COLORS[role] ?? 'bg-gray-100 text-gray-800') : 'bg-gray-100 text-gray-800'
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>
      {label}
    </span>
  )
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
      }`}
    >
      {isActive ? '有効' : '無効'}
    </span>
  )
}

export function AdminUsersPage() {
  const [page, setPage] = useState(1)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editFullName, setEditFullName] = useState('')

  const { data: users, isLoading, isError } = useUserList(page)
  const { mutate: updateUser, isPending } = useUpdateUser()

  function startEdit(id: string, currentName: string) {
    setEditingId(id)
    setEditFullName(currentName)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditFullName('')
  }

  function saveEdit(id: string) {
    updateUser(
      { id, payload: { full_name: editFullName } },
      { onSuccess: () => setEditingId(null) }
    )
  }

  function toggleActive(id: string, currentActive: boolean) {
    updateUser({ id, payload: { is_active: !currentActive } })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ユーザー管理</h1>
        <span className="text-sm text-muted-foreground">管理者のみアクセス可能</span>
      </div>

      {isLoading && (
        <div className="flex justify-center py-8 text-muted-foreground">読み込み中...</div>
      )}

      {isError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          ユーザー一覧の取得に失敗しました。
        </div>
      )}

      {users && (
        <>
          <div className="rounded-lg border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">氏名</th>
                  <th className="px-4 py-3 text-left font-medium">メールアドレス</th>
                  <th className="px-4 py-3 text-left font-medium">ロール</th>
                  <th className="px-4 py-3 text-left font-medium">状態</th>
                  <th className="px-4 py-3 text-left font-medium">登録日</th>
                  <th className="px-4 py-3 text-left font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      ユーザーが見つかりません
                    </td>
                  </tr>
                )}
                {users.map((user) => (
                  <tr key={user.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      {editingId === user.id ? (
                        <input
                          type="text"
                          value={editFullName}
                          onChange={(e) => setEditFullName(e.target.value)}
                          className="rounded border px-2 py-1 text-sm w-40"
                          autoFocus
                        />
                      ) : (
                        <span className="font-medium">{user.full_name}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                    <td className="px-4 py-3">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge isActive={user.is_active} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {editingId === user.id ? (
                          <>
                            <button
                              onClick={() => saveEdit(user.id)}
                              disabled={isPending}
                              className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                            >
                              保存
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="rounded border px-2 py-1 text-xs hover:bg-muted"
                            >
                              キャンセル
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(user.id, user.full_name)}
                              className="rounded border px-2 py-1 text-xs hover:bg-muted"
                            >
                              編集
                            </button>
                            <button
                              onClick={() => toggleActive(user.id, user.is_active)}
                              disabled={isPending}
                              className={`rounded px-2 py-1 text-xs disabled:opacity-50 ${
                                user.is_active
                                  ? 'border border-destructive text-destructive hover:bg-destructive/10'
                                  : 'border border-green-600 text-green-700 hover:bg-green-50'
                              }`}
                            >
                              {user.is_active ? '無効化' : '有効化'}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>ページ {page}</span>
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
                disabled={users.length < 20}
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
