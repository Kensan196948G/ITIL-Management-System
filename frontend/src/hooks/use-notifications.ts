import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notificationsApi, type ListNotificationsParams } from '@/api/notifications'

const QUERY_KEY = 'notifications'

export function useNotifications(params?: ListNotificationsParams) {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: () => notificationsApi.list(params),
    refetchInterval: 30_000,
  })
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })
}

export function useDeleteNotification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => notificationsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })
}
