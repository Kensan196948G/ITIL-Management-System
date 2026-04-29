import { client } from './client'
import type { PaginatedResponse } from '@/types'
import type {
  AssignRequest,
  CreateIncidentRequest,
  CreateSLAPolicyRequest,
  Incident,
  IncidentDetail,
  IncidentPriority,
  IncidentStatus,
  SLAPolicy,
  SLAStatus,
  TransitionRequest,
  UpdateIncidentRequest,
  UpdateSLAPolicyRequest,
} from '@/types/incident'

export interface ListIncidentsParams {
  status?: IncidentStatus
  priority?: IncidentPriority
  assignee_id?: string
  page?: number
  page_size?: number
}

export const incidentsApi = {
  list: (params?: ListIncidentsParams) =>
    client.get<PaginatedResponse<Incident>>('/incidents', { params }).then((r) => r.data),

  get: (id: string) =>
    client.get<IncidentDetail>(`/incidents/${id}`).then((r) => r.data),

  create: (data: CreateIncidentRequest) =>
    client.post<Incident>('/incidents', data).then((r) => r.data),

  update: (id: string, data: UpdateIncidentRequest) =>
    client.put<Incident>(`/incidents/${id}`, data).then((r) => r.data),

  transition: (id: string, data: TransitionRequest) =>
    client.post<IncidentDetail>(`/incidents/${id}/transition`, data).then((r) => r.data),

  assign: (id: string, data: AssignRequest) =>
    client.post<Incident>(`/incidents/${id}/assign`, data).then((r) => r.data),

  getSLA: (id: string) =>
    client.get<SLAStatus>(`/incidents/${id}/sla`).then((r) => r.data),

  getAllowedTransitions: (id: string) =>
    client.get<IncidentStatus[]>(`/incidents/${id}/transitions`).then((r) => r.data),
}

export const slaPoliciesApi = {
  list: () =>
    client.get<SLAPolicy[]>('/sla-policies').then((r) => r.data),

  get: (priority: IncidentPriority) =>
    client.get<SLAPolicy>(`/sla-policies/${priority}`).then((r) => r.data),

  create: (data: CreateSLAPolicyRequest) =>
    client.post<SLAPolicy>('/sla-policies', data).then((r) => r.data),

  update: (priority: IncidentPriority, data: UpdateSLAPolicyRequest) =>
    client.put<SLAPolicy>(`/sla-policies/${priority}`, data).then((r) => r.data),

  delete: (priority: IncidentPriority) =>
    client.delete(`/sla-policies/${priority}`).then((r) => r.data),
}
