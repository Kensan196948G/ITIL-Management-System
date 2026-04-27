import { client } from './client'

export interface DashboardSummary {
  incidents: {
    total: number
    open: number
    pending: number
    resolved: number
    closed: number
    by_priority: {
      p1_critical: number
      p2_high: number
      p3_medium: number
      p4_low: number
    }
  }
  service_requests: {
    total: number
    open: number
    approved: number
    completed: number
    rejected: number
  }
  change_requests: {
    total: number
    draft: number
    in_review: number
    approved: number
    in_progress: number
    completed: number
  }
}

export interface DashboardKPIs {
  mttr_minutes: number | null
  sla_breach_rate: number
  sla_overdue_count: number
  change_success_rate: number | null
  change_completed: number
  change_failed: number
  problem_count: number
  known_error_count: number
  generated_at: string
}

export const dashboardApi = {
  getSummary: () =>
    client.get<DashboardSummary>('/dashboard/summary').then((r) => r.data),
  getKPIs: () =>
    client.get<DashboardKPIs>('/dashboard/kpis').then((r) => r.data),
}
