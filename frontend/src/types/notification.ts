export type NotificationCategory = 'incident' | 'service_request' | 'change_request' | 'system'
export type NotificationPriority = 'low' | 'medium' | 'high'

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  category: NotificationCategory
  priority: NotificationPriority
  is_read: boolean
  related_id: string | null
  related_url: string | null
  created_at: string
}

export interface NotificationListResponse {
  items: Notification[]
  total: number
  unread_count: number
}

export interface MarkReadRequest {
  notification_ids: string[]
}
