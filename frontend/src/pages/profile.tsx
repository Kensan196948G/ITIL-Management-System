import { useState } from 'react'
import { useAuthStore } from '@/store/auth-store'
import { useUpdateUser } from '@/hooks/use-users'

const ROLE_LABELS: Record<string, string> = {
  admin: '管理者',
  agent: 'エージェント',
  user: '一般ユーザー',
}

export function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  const [isEditing, setIsEditing] = useState(false)
  const [fullName, setFullName] = useState(user?.full_name ?? '')
  const { mutate: updateUser, isPending, isSuccess, isError } = useUpdateUser()

  if (!user) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <p className="text-muted-foreground">ユーザー情報を取得できません。</p>
      </div>
    )
  }

  function handleSave() {
    if (!user) return
    updateUser(
      { id: user.id, payload: { full_name: fullName } },
      { onSuccess: () => setIsEditing(false) }
    )
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">プロフィール</h1>

      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
            {user.full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-lg font-semibold">{user.full_name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <div className="space-y-3 border-t pt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">ロール</span>
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              {ROLE_LABELS[user.role] ?? user.role}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">メールアドレス</span>
            <span className="text-sm">{user.email}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">氏名</span>
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="rounded border px-2 py-1 text-sm w-48"
                  autoFocus
                />
                <button
                  onClick={handleSave}
                  disabled={isPending}
                  className="rounded bg-primary px-3 py-1 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {isPending ? '保存中...' : '保存'}
                </button>
                <button
                  onClick={() => { setIsEditing(false); setFullName(user.full_name) }}
                  className="rounded border px-3 py-1 text-xs hover:bg-muted"
                >
                  キャンセル
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm">{user.full_name}</span>
                <button
                  onClick={() => setIsEditing(true)}
                  className="rounded border px-2 py-1 text-xs hover:bg-muted"
                >
                  編集
                </button>
              </div>
            )}
          </div>
        </div>

        {isSuccess && (
          <p className="text-sm text-green-600">プロフィールを更新しました。</p>
        )}
        {isError && (
          <p className="text-sm text-destructive">更新に失敗しました。</p>
        )}
      </div>
    </div>
  )
}
