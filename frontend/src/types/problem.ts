export type ProblemStatus =
  | 'open'
  | 'under_investigation'
  | 'known_error'
  | 'resolved'
  | 'closed'

export type ProblemPriority =
  | 'p1_critical'
  | 'p2_high'
  | 'p3_medium'
  | 'p4_low'

export interface Problem {
  id: string
  title: string
  description: string
  status: ProblemStatus
  priority: ProblemPriority
  reporter_id: string
  assignee_id: string | null
  root_cause: string | null
  workaround: string | null
  is_known_error: boolean
  resolved_at: string | null
  closed_at: string | null
  created_at: string
  updated_at: string
}

export interface ProblemStatusLog {
  id: string
  problem_id: string
  from_status: ProblemStatus | null
  to_status: ProblemStatus
  changed_by_id: string
  comment: string | null
  created_at: string
}

export interface LinkedIncident {
  id: string
  title: string
  status: string
  priority: string
}

export interface ProblemDetail extends Problem {
  status_logs: ProblemStatusLog[]
  linked_incidents: LinkedIncident[]
}

export interface CreateProblemRequest {
  title: string
  description: string
  priority?: ProblemPriority
  assignee_id?: string
  root_cause?: string
  workaround?: string
}

export interface UpdateProblemRequest {
  title?: string
  description?: string
  priority?: ProblemPriority
  assignee_id?: string
  root_cause?: string
  workaround?: string
  is_known_error?: boolean
}

export interface ProblemTransitionRequest {
  to_status: ProblemStatus
  comment?: string
}

export const STATUS_LABELS: Record<ProblemStatus, string> = {
  open: '未調査',
  under_investigation: '調査中',
  known_error: '既知エラー',
  resolved: '解決済み',
  closed: 'クローズ',
}

export const PRIORITY_LABELS: Record<ProblemPriority, string> = {
  p1_critical: 'P1 緊急',
  p2_high: 'P2 高',
  p3_medium: 'P3 中',
  p4_low: 'P4 低',
}

export const STATUS_COLORS: Record<ProblemStatus, string> = {
  open: 'bg-blue-100 text-blue-800',
  under_investigation: 'bg-yellow-100 text-yellow-800',
  known_error: 'bg-orange-100 text-orange-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
}

export const PRIORITY_COLORS: Record<ProblemPriority, string> = {
  p1_critical: 'bg-red-100 text-red-800 font-bold',
  p2_high: 'bg-orange-100 text-orange-800',
  p3_medium: 'bg-yellow-100 text-yellow-800',
  p4_low: 'bg-green-100 text-green-800',
}
