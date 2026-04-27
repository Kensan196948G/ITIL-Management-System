import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/api/dashboard'

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => dashboardApi.getSummary(),
    refetchInterval: 60_000,
  })
}

export function useDashboardKPIs() {
  return useQuery({
    queryKey: ['dashboard', 'kpis'],
    queryFn: () => dashboardApi.getKPIs(),
    refetchInterval: 60_000,
  })
}
