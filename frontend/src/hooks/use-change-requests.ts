import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  cabVotesApi,
  changeRequestsApi,
  changeScheduleApi,
  type ListChangeRequestsParams,
} from '@/api/change-requests'
import type {
  ApproveChangeRequestRequest,
  CABVoteCreate,
  ChangeScheduleCreate,
  CreateChangeRequestRequest,
  RejectChangeRequestRequest,
  TransitionChangeRequestRequest,
  UpdateChangeRequestRequest,
} from '@/types/change-request'

const QUERY_KEYS = {
  list: (params?: ListChangeRequestsParams) => ['change-requests', params] as const,
  detail: (id: string) => ['change-requests', id] as const,
  transitions: (id: string) => ['change-requests', id, 'transitions'] as const,
  cabVotes: (id: string) => ['change-requests', id, 'cab-votes'] as const,
  schedule: (id: string) => ['change-requests', id, 'schedule'] as const,
  calendar: (from?: string, to?: string) => ['change-requests', 'calendar', from, to] as const,
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

export function useCABVotes(changeRequestId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.cabVotes(changeRequestId),
    queryFn: () => cabVotesApi.list(changeRequestId),
    enabled: !!changeRequestId,
  })
}

export function useCastCABVote(changeRequestId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CABVoteCreate) => cabVotesApi.cast(changeRequestId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.cabVotes(changeRequestId) })
    },
  })
}

export function useChangeSchedule(changeRequestId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.schedule(changeRequestId),
    queryFn: () => changeScheduleApi.get(changeRequestId),
    enabled: !!changeRequestId,
    retry: false,
  })
}

export function useCreateChangeSchedule(changeRequestId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ChangeScheduleCreate) => changeScheduleApi.create(changeRequestId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.schedule(changeRequestId) })
    },
  })
}

export function useUpdateChangeSchedule(changeRequestId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ChangeScheduleCreate) => changeScheduleApi.update(changeRequestId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.schedule(changeRequestId) })
    },
  })
}

export function useChangeScheduleCalendar(from_date?: string, to_date?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.calendar(from_date, to_date),
    queryFn: () => changeScheduleApi.calendar(from_date, to_date),
  })
}
