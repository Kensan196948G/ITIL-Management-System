import { client } from './client'
import type { MarkReadRequest, NotificationListResponse } from '@/types/notification'

export interface ListNotificationsParams {
  skip?: number
  limit?: number
  unread_only?: boolean
  category?: string
}

export const notificationsApi = {
  list: (params?: ListNotificationsParams) =>
    client.get<NotificationListResponse>('/notifications', { params }).then((r) => r.data),

  markRead: (data: MarkReadRequest) =>
    client.patch<{ marked_read: number }>('/notifications/read', data).then((r) => r.data),

  markAllRead: () =>
    client.patch<{ marked_read: number }>('/notifications/read-all').then((r) => r.data),

  delete: (id: string) =>
    client.delete(`/notifications/${id}`).then((r) => r.data),
}
