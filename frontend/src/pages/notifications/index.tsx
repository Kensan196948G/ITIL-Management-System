import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Check, CheckCheck, Trash2 } from 'lucide-react'
import {
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationsRead,
  useNotifications,
} from '@/hooks/use-notifications'
import type { NotificationCategory } from '@/types/notification'

const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  incident: 'インシデント',
  service_request: 'サービスリクエスト',
  change_request: '変更申請',
  system: 'システム',
}

const CATEGORY_COLORS: Record<NotificationCategory, string> = {
  incident: 'bg-red-100 text-red-700',
  service_request: 'bg-blue-100 text-blue-700',
  change_request: 'bg-yellow-100 text-yellow-700',
  system: 'bg-gray-100 text-gray-700',
}

export function NotificationsPage() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const { data, isLoading, isError } = useNotifications({
    unread_only: filter === 'unread',
    limit: 100,
  })
  const markRead = useMarkNotificationsRead()
  const markAllRead = useMarkAllNotificationsRead()
  const deleteNotif = useDeleteNotification()

  if (isLoading) return <div className="p-8 text-muted-foreground">読み込み中...</div>
  if (isError) return <div className="p-8 text-destructive">通知の取得に失敗しました。</div>

  const notifications = data?.items ?? []
  const unreadCount = data?.unread_count ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6" />
            通知
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">システムからの通知を確認できます</p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-accent transition-colors"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            <CheckCheck className="h-4 w-4" />
            すべて既読にする
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-border">
        {(['all', 'unread'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              filter === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setFilter(tab)}
          >
            {tab === 'all' ? 'すべて' : '未読のみ'}
          </button>
        ))}
      </div>

      {/* Notification list */}
      {notifications.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">通知はありません</div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-4 rounded-lg border p-4 transition-colors ${
                n.is_read ? 'border-border bg-card' : 'border-primary/20 bg-primary/5'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[n.category]}`}
                  >
                    {CATEGORY_LABELS[n.category]}
                  </span>
                  {!n.is_read && (
                    <span className="inline-block h-2 w-2 rounded-full bg-primary" />
                  )}
                </div>
                <p className="text-sm font-medium truncate">{n.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                {n.related_url && (
                  <Link
                    to={n.related_url}
                    className="text-xs text-primary hover:underline mt-1 inline-block"
                    onClick={() => {
                      if (!n.is_read) markRead.mutate({ notification_ids: [n.id] })
                    }}
                  >
                    詳細を見る →
                  </Link>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(n.created_at).toLocaleString('ja-JP')}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!n.is_read && (
                  <button
                    type="button"
                    title="既読にする"
                    className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    onClick={() => markRead.mutate({ notification_ids: [n.id] })}
                    disabled={markRead.isPending}
                  >
                    <Check className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  title="削除"
                  className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  onClick={() => deleteNotif.mutate(n.id)}
                  disabled={deleteNotif.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
