import { client } from './client'
import type { PaginatedResponse } from '@/types'
import type {
  CreateProblemRequest,
  Problem,
  ProblemDetail,
  ProblemPriority,
  ProblemStatus,
  ProblemTransitionRequest,
  UpdateProblemRequest,
} from '@/types/problem'

export interface ListProblemsParams {
  status?: ProblemStatus
  priority?: ProblemPriority
  assignee_id?: string
  is_known_error?: boolean
  search?: string
  page?: number
  page_size?: number
}

export const problemsApi = {
  list: (params?: ListProblemsParams) =>
    client.get<PaginatedResponse<Problem>>('/problems', { params }).then((r) => r.data),

  get: (id: string) =>
    client.get<ProblemDetail>(`/problems/${id}`).then((r) => r.data),

  create: (data: CreateProblemRequest) =>
    client.post<Problem>('/problems', data).then((r) => r.data),

  update: (id: string, data: UpdateProblemRequest) =>
    client.put<Problem>(`/problems/${id}`, data).then((r) => r.data),

  transition: (id: string, data: ProblemTransitionRequest) =>
    client.post<ProblemDetail>(`/problems/${id}/transition`, data).then((r) => r.data),

  getAllowedTransitions: (id: string) =>
    client.get<ProblemStatus[]>(`/problems/${id}/transitions`).then((r) => r.data),

  linkIncident: (id: string, incident_id: string) =>
    client.post<ProblemDetail>(`/problems/${id}/link-incident`, { incident_id }).then((r) => r.data),

  unlinkIncident: (id: string, incident_id: string) =>
    client.delete<ProblemDetail>(`/problems/${id}/unlink-incident/${incident_id}`).then((r) => r.data),
}
