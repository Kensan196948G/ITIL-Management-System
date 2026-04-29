import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { incidentsApi, slaPoliciesApi, type ListIncidentsParams } from '@/api/incidents'
import type {
  AssignRequest,
  CreateIncidentRequest,
  CreateSLAPolicyRequest,
  IncidentPriority,
  TransitionRequest,
  UpdateIncidentRequest,
  UpdateSLAPolicyRequest,
} from '@/types/incident'

const QUERY_KEYS = {
  list: (params?: ListIncidentsParams) => ['incidents', params] as const,
  detail: (id: string) => ['incidents', id] as const,
  sla: (id: string) => ['incidents', id, 'sla'] as const,
  transitions: (id: string) => ['incidents', id, 'transitions'] as const,
  slaPolicies: ['sla-policies'] as const,
  slaPolicy: (priority: IncidentPriority) => ['sla-policies', priority] as const,
}

export function useIncidents(params?: ListIncidentsParams) {
  return useQuery({
    queryKey: QUERY_KEYS.list(params),
    queryFn: () => incidentsApi.list(params),
  })
}

export function useIncident(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.detail(id),
    queryFn: () => incidentsApi.get(id),
    enabled: !!id,
  })
}

export function useSLAStatus(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.sla(id),
    queryFn: () => incidentsApi.getSLA(id),
    enabled: !!id,
    refetchInterval: 60_000,
  })
}

export function useAllowedTransitions(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.transitions(id),
    queryFn: () => incidentsApi.getAllowedTransitions(id),
    enabled: !!id,
  })
}

export function useCreateIncident() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateIncidentRequest) => incidentsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incidents'] })
    },
  })
}

export function useUpdateIncident(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateIncidentRequest) => incidentsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incidents', id] })
      qc.invalidateQueries({ queryKey: ['incidents'] })
    },
  })
}

export function useTransitionIncident(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: TransitionRequest) => incidentsApi.transition(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incidents', id] })
      qc.invalidateQueries({ queryKey: ['incidents'] })
    },
  })
}

export function useAssignIncident(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: AssignRequest) => incidentsApi.assign(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incidents', id] })
    },
  })
}

export function useSLAPolicies() {
  return useQuery({
    queryKey: QUERY_KEYS.slaPolicies,
    queryFn: () => slaPoliciesApi.list(),
  })
}

export function useCreateSLAPolicy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateSLAPolicyRequest) => slaPoliciesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.slaPolicies })
    },
  })
}

export function useUpdateSLAPolicy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ priority, data }: { priority: IncidentPriority; data: UpdateSLAPolicyRequest }) =>
      slaPoliciesApi.update(priority, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.slaPolicies })
    },
  })
}

export function useDeleteSLAPolicy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (priority: IncidentPriority) => slaPoliciesApi.delete(priority),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.slaPolicies })
    },
  })
}
