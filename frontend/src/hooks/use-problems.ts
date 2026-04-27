import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { problemsApi, type ListProblemsParams } from '@/api/problems'
import type {
  CreateProblemRequest,
  ProblemTransitionRequest,
  UpdateProblemRequest,
} from '@/types/problem'

const QUERY_KEYS = {
  list: (params?: ListProblemsParams) => ['problems', params] as const,
  detail: (id: string) => ['problems', id] as const,
  transitions: (id: string) => ['problems', id, 'transitions'] as const,
}

export function useProblems(params?: ListProblemsParams) {
  return useQuery({
    queryKey: QUERY_KEYS.list(params),
    queryFn: () => problemsApi.list(params),
  })
}

export function useProblem(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.detail(id),
    queryFn: () => problemsApi.get(id),
    enabled: !!id,
  })
}

export function useProblemAllowedTransitions(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.transitions(id),
    queryFn: () => problemsApi.getAllowedTransitions(id),
    enabled: !!id,
  })
}

export function useCreateProblem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateProblemRequest) => problemsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['problems'] })
    },
  })
}

export function useUpdateProblem(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateProblemRequest) => problemsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['problems', id] })
      qc.invalidateQueries({ queryKey: ['problems'] })
    },
  })
}

export function useTransitionProblem(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ProblemTransitionRequest) => problemsApi.transition(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['problems', id] })
      qc.invalidateQueries({ queryKey: ['problems'] })
    },
  })
}

export function useLinkIncident(problemId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (incident_id: string) => problemsApi.linkIncident(problemId, incident_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['problems', problemId] })
    },
  })
}

export function useUnlinkIncident(problemId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (incident_id: string) => problemsApi.unlinkIncident(problemId, incident_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['problems', problemId] })
    },
  })
}
