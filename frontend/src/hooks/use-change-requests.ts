import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { changeRequestsApi, type ListChangeRequestsParams } from '@/api/change-requests'
import type {
  ApproveChangeRequestRequest,
  CreateChangeRequestRequest,
  RejectChangeRequestRequest,
  TransitionChangeRequestRequest,
  UpdateChangeRequestRequest,
} from '@/types/change-request'

const QUERY_KEYS = {
  list: (params?: ListChangeRequestsParams) => ['change-requests', params] as const,
  detail: (id: string) => ['change-requests', id] as const,
  transitions: (id: string) => ['change-requests', id, 'transitions'] as const,
}

export function useChangeRequests(params?: ListChangeRequestsParams) {
  return useQuery({
    queryKey: QUERY_KEYS.list(params),
    queryFn: () => changeRequestsApi.list(params),
  })
}

export function useChangeRequest(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.detail(id),
    queryFn: () => changeRequestsApi.get(id),
    enabled: !!id,
  })
}

export function useAllowedChangeRequestTransitions(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.transitions(id),
    queryFn: () => changeRequestsApi.getAllowedTransitions(id),
    enabled: !!id,
  })
}

export function useCreateChangeRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateChangeRequestRequest) => changeRequestsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['change-requests'] })
    },
  })
}

export function useUpdateChangeRequest(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateChangeRequestRequest) => changeRequestsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['change-requests', id] })
      qc.invalidateQueries({ queryKey: ['change-requests'] })
    },
  })
}

export function useApproveChangeRequest(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ApproveChangeRequestRequest) => changeRequestsApi.approve(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['change-requests', id] })
      qc.invalidateQueries({ queryKey: ['change-requests'] })
    },
  })
}

export function useRejectChangeRequest(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: RejectChangeRequestRequest) => changeRequestsApi.reject(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['change-requests', id] })
      qc.invalidateQueries({ queryKey: ['change-requests'] })
    },
  })
}

export function useTransitionChangeRequest(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: TransitionChangeRequestRequest) =>
      changeRequestsApi.transition(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['change-requests', id] })
      qc.invalidateQueries({ queryKey: ['change-requests'] })
    },
  })
}
