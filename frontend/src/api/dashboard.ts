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

export const dashboardApi = {
  getSummary: () =>
    client.get<DashboardSummary>('/dashboard/summary').then((r) => r.data),
}
