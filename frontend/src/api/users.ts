import { client } from './client'

export interface UserResponse {
  id: string
  email: string
  full_name: string
  role: string | null
  is_active: boolean
  created_at: string
}

export interface UserUpdate {
  full_name?: string
  is_active?: boolean
}

export interface AuditLogResponse {
  id: string
  table_name: string
  record_id: string
  action: string
  user_id: string | null
  changes: Record<string, unknown> | null
  created_at: string
}

export const usersApi = {
  list: (page = 1, pageSize = 20) =>
    client
      .get<UserResponse[]>('/users/', { params: { page, page_size: pageSize } })
      .then((r) => r.data),

  get: (id: string) =>
    client.get<UserResponse>(`/users/${id}`).then((r) => r.data),

  update: (id: string, payload: UserUpdate) =>
    client.put<UserResponse>(`/users/${id}`, payload).then((r) => r.data),
}

export const auditLogsApi = {
  list: (params?: {
    table_name?: string
    record_id?: string
    action?: string
    user_id?: string
    page?: number
    page_size?: number
  }) =>
    client
      .get<AuditLogResponse[]>('/audit-logs/', { params })
      .then((r) => r.data),

  get: (id: string) =>
    client.get<AuditLogResponse>(`/audit-logs/${id}`).then((r) => r.data),
}
