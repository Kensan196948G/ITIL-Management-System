export type IncidentStatus =
  | 'new'
  | 'assigned'
  | 'in_progress'
  | 'pending'
  | 'resolved'
  | 'closed'
  | 'cancelled'

export type IncidentPriority =
  | 'p1_critical'
  | 'p2_high'
  | 'p3_medium'
  | 'p4_low'

export interface Incident {
  id: string
  title: string
  description: string
  status: IncidentStatus
  priority: IncidentPriority
  category: string | null
  subcategory: string | null
  reporter_id: string
  assignee_id: string | null
  sla_due_at: string | null
  resolved_at: string | null
  closed_at: string | null
  created_at: string
  updated_at: string
}

export interface StatusLog {
  id: string
  incident_id: string
  from_status: IncidentStatus | null
  to_status: IncidentStatus
  changed_by_id: string
  comment: string | null
  created_at: string
}

export interface IncidentDetail extends Incident {
  status_logs: StatusLog[]
}

export interface SLAStatus {
  incident_id: string
  sla_due_at: string | null
  is_overdue: boolean
  remaining_minutes: number | null
}

export interface CreateIncidentRequest {
  title: string
  description: string
  priority?: IncidentPriority
  category?: string
  subcategory?: string
  assignee_id?: string
}

export interface UpdateIncidentRequest {
  title?: string
  description?: string
  priority?: IncidentPriority
  category?: string
  subcategory?: string
}

export interface TransitionRequest {
  to_status: IncidentStatus
  comment?: string
  assignee_id?: string
}

export interface AssignRequest {
  assignee_id: string
  comment?: string
}

export const STATUS_LABELS: Record<IncidentStatus, string> = {
  new: '新規',
  assigned: '割り当て済み',
  in_progress: '対応中',
  pending: '保留中',
  resolved: '解決済み',
  closed: 'クローズ',
  cancelled: 'キャンセル',
}

export const PRIORITY_LABELS: Record<IncidentPriority, string> = {
  p1_critical: 'P1 緊急',
  p2_high: 'P2 高',
  p3_medium: 'P3 中',
  p4_low: 'P4 低',
}

export const STATUS_COLORS: Record<IncidentStatus, string> = {
  new: 'bg-blue-100 text-blue-800',
  assigned: 'bg-purple-100 text-purple-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  pending: 'bg-orange-100 text-orange-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
}

export const PRIORITY_COLORS: Record<IncidentPriority, string> = {
  p1_critical: 'bg-red-100 text-red-800 font-bold',
  p2_high: 'bg-orange-100 text-orange-800',
  p3_medium: 'bg-yellow-100 text-yellow-800',
  p4_low: 'bg-green-100 text-green-800',
}
