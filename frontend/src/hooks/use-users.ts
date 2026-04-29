import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { usersApi, auditLogsApi, type UserUpdate } from '@/api/users'

export function useUserList(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ['users', page, pageSize],
    queryFn: () => usersApi.list(page, pageSize),
  })
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => usersApi.get(id),
    enabled: !!id,
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UserUpdate }) =>
      usersApi.update(id, payload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['users', id] })
    },
  })
}

export function useAuditLogs(params?: {
  table_name?: string
  record_id?: string
  action?: string
  page?: number
}) {
  return useQuery({
    queryKey: ['audit-logs', params],
    queryFn: () => auditLogsApi.list(params),
  })
}
