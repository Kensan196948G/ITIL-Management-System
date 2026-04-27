import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { serviceRequestsApi, type ListServiceRequestsParams } from '@/api/service-requests'
import type {
  ApproveServiceRequestRequest,
  CreateServiceRequestRequest,
  RejectServiceRequestRequest,
  TransitionServiceRequestRequest,
  UpdateServiceRequestRequest,
} from '@/types/service-request'

const QUERY_KEYS = {
  list: (params?: ListServiceRequestsParams) => ['service-requests', params] as const,
  detail: (id: string) => ['service-requests', id] as const,
  transitions: (id: string) => ['service-requests', id, 'transitions'] as const,
}

export function useServiceRequests(params?: ListServiceRequestsParams) {
  return useQuery({
    queryKey: QUERY_KEYS.list(params),
    queryFn: () => serviceRequestsApi.list(params),
  })
}

export function useServiceRequest(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.detail(id),
    queryFn: () => serviceRequestsApi.get(id),
    enabled: !!id,
  })
}

export function useAllowedServiceRequestTransitions(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.transitions(id),
    queryFn: () => serviceRequestsApi.getAllowedTransitions(id),
    enabled: !!id,
  })
}

export function useCreateServiceRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateServiceRequestRequest) => serviceRequestsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service-requests'] })
    },
  })
}

export function useUpdateServiceRequest(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateServiceRequestRequest) => serviceRequestsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service-requests', id] })
      qc.invalidateQueries({ queryKey: ['service-requests'] })
    },
  })
}

export function useApproveServiceRequest(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ApproveServiceRequestRequest) => serviceRequestsApi.approve(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service-requests', id] })
      qc.invalidateQueries({ queryKey: ['service-requests'] })
    },
  })
}

export function useRejectServiceRequest(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: RejectServiceRequestRequest) => serviceRequestsApi.reject(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service-requests', id] })
      qc.invalidateQueries({ queryKey: ['service-requests'] })
    },
  })
}

export function useTransitionServiceRequest(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: TransitionServiceRequestRequest) =>
      serviceRequestsApi.transition(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service-requests', id] })
      qc.invalidateQueries({ queryKey: ['service-requests'] })
    },
  })
}
