export type ChangeRequestStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'cancelled'

export type ChangeRequestType = 'standard' | 'normal' | 'emergency'

export type ChangeRequestRisk = 'low' | 'medium' | 'high'

export type ChangeRequestPriority = 'low' | 'medium' | 'high' | 'critical'

export interface ChangeRequest {
  id: string
  title: string
  description: string
  status: ChangeRequestStatus
  change_type: ChangeRequestType
  risk_level: ChangeRequestRisk
  priority: ChangeRequestPriority
  requester_id: string
  reviewer_id: string | null
  approver_id: string | null
  implementer_id: string | null
  planned_start_at: string | null
  planned_end_at: string | null
  actual_start_at: string | null
  actual_end_at: string | null
  approved_at: string | null
  rejected_at: string | null
  completed_at: string | null
  rejection_reason: string | null
  rollback_plan: string | null
  created_at: string
  updated_at: string
}

export interface ChangeRequestStatusLog {
  id: string
  change_request_id: string
  from_status: ChangeRequestStatus | null
  to_status: ChangeRequestStatus
  changed_by_id: string
  comment: string | null
  created_at: string
}

export interface ChangeRequestDetail extends ChangeRequest {
  status_logs: ChangeRequestStatusLog[]
}

export interface CreateChangeRequestRequest {
  title: string
  description: string
  change_type?: ChangeRequestType
  risk_level?: ChangeRequestRisk
  priority?: ChangeRequestPriority
  planned_start_at?: string | null
  planned_end_at?: string | null
  rollback_plan?: string | null
  implementer_id?: string | null
}

export interface UpdateChangeRequestRequest {
  title?: string
  description?: string
  change_type?: ChangeRequestType
  risk_level?: ChangeRequestRisk
  priority?: ChangeRequestPriority
  planned_start_at?: string | null
  planned_end_at?: string | null
  rollback_plan?: string | null
  implementer_id?: string | null
}

export interface ApproveChangeRequestRequest {
  comment?: string | null
  reviewer_id?: string | null
}

export interface RejectChangeRequestRequest {
  rejection_reason: string
}

export interface TransitionChangeRequestRequest {
  to_status: ChangeRequestStatus
  comment?: string | null
}

export const STATUS_LABELS: Record<ChangeRequestStatus, string> = {
  draft: '下書き',
  submitted: '提出済み',
  under_review: 'レビュー中',
  approved: '承認済み',
  rejected: '却下',
  in_progress: '実施中',
  completed: '完了',
  failed: '失敗',
  cancelled: 'キャンセル',
}

export const TYPE_LABELS: Record<ChangeRequestType, string> = {
  standard: '標準変更',
  normal: '通常変更',
  emergency: '緊急変更',
}

export const RISK_LABELS: Record<ChangeRequestRisk, string> = {
  low: '低',
  medium: '中',
  high: '高',
}

export const PRIORITY_LABELS: Record<ChangeRequestPriority, string> = {
  low: '低',
  medium: '中',
  high: '高',
  critical: '緊急',
}

export const STATUS_COLORS: Record<ChangeRequestStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-blue-100 text-blue-800',
  under_review: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  in_progress: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-200 text-green-900',
  failed: 'bg-red-200 text-red-900',
  cancelled: 'bg-gray-100 text-gray-500',
}

export const RISK_COLORS: Record<ChangeRequestRisk, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700',
}

export const TYPE_COLORS: Record<ChangeRequestType, string> = {
  standard: 'bg-blue-100 text-blue-700',
  normal: 'bg-gray-100 text-gray-700',
  emergency: 'bg-orange-100 text-orange-700',
}
