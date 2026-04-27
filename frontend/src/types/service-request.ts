export type ServiceRequestStatus =
  | 'submitted'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

export type ServiceRequestCategory =
  | 'it_equipment'
  | 'software_access'
  | 'network_access'
  | 'user_account'
  | 'other'

export interface ServiceRequest {
  id: string
  title: string
  description: string
  status: ServiceRequestStatus
  category: ServiceRequestCategory
  requester_id: string
  approver_id: string | null
  assignee_id: string | null
  due_date: string | null
  approved_at: string | null
  rejected_at: string | null
  completed_at: string | null
  rejection_reason: string | null
  created_at: string
  updated_at: string
}

export interface ServiceRequestStatusLog {
  id: string
  service_request_id: string
  from_status: ServiceRequestStatus | null
  to_status: ServiceRequestStatus
  changed_by_id: string
  comment: string | null
  created_at: string
}

export interface ServiceRequestDetail extends ServiceRequest {
  status_logs: ServiceRequestStatusLog[]
}

export interface CreateServiceRequestRequest {
  title: string
  description: string
  category: ServiceRequestCategory
  due_date?: string | null
  assignee_id?: string | null
}

export interface UpdateServiceRequestRequest {
  title?: string
  description?: string
  category?: ServiceRequestCategory
  due_date?: string | null
}

export interface ApproveServiceRequestRequest {
  comment?: string | null
  assignee_id?: string | null
}

export interface RejectServiceRequestRequest {
  rejection_reason: string
}

export interface TransitionServiceRequestRequest {
  to_status: ServiceRequestStatus
  comment?: string | null
}

export const STATUS_LABELS: Record<ServiceRequestStatus, string> = {
  submitted: '提出済み',
  pending_approval: '承認待ち',
  approved: '承認済み',
  rejected: '却下',
  in_progress: '対応中',
  completed: '完了',
  cancelled: 'キャンセル',
}

export const CATEGORY_LABELS: Record<ServiceRequestCategory, string> = {
  it_equipment: 'IT機器',
  software_access: 'ソフトウェアアクセス',
  network_access: 'ネットワークアクセス',
  user_account: 'ユーザーアカウント',
  other: 'その他',
}

export const STATUS_COLORS: Record<ServiceRequestStatus, string> = {
  submitted: 'bg-gray-100 text-gray-800',
  pending_approval: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  rejected: 'bg-red-100 text-red-800',
  in_progress: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-500',
}
