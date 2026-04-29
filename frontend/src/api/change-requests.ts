import { client } from './client'
import type { PaginatedResponse } from '@/types'
import type {
  ApproveChangeRequestRequest,
  CABVote,
  CABVoteCreate,
  ChangeRequest,
  ChangeRequestDetail,
  ChangeRequestPriority,
  ChangeRequestRisk,
  ChangeRequestStatus,
  ChangeRequestType,
  ChangeSchedule,
  ChangeScheduleCalendarItem,
  ChangeScheduleCreate,
  CreateChangeRequestRequest,
  RejectChangeRequestRequest,
  TransitionChangeRequestRequest,
  UpdateChangeRequestRequest,
} from '@/types/change-request'

export interface ListChangeRequestsParams {
  status?: ChangeRequestStatus
  change_type?: ChangeRequestType
  risk_level?: ChangeRequestRisk
  priority?: ChangeRequestPriority
  requester_id?: string
  page?: number
  page_size?: number
}

export const changeRequestsApi = {
  list: (params?: ListChangeRequestsParams) =>
    client
      .get<PaginatedResponse<ChangeRequest>>('/change-requests', { params })
      .then((r) => r.data),

  get: (id: string) =>
    client.get<ChangeRequestDetail>(`/change-requests/${id}`).then((r) => r.data),

  create: (data: CreateChangeRequestRequest) =>
    client.post<ChangeRequest>('/change-requests', data).then((r) => r.data),

  update: (id: string, data: UpdateChangeRequestRequest) =>
    client.put<ChangeRequest>(`/change-requests/${id}`, data).then((r) => r.data),

  approve: (id: string, data: ApproveChangeRequestRequest) =>
    client
      .post<ChangeRequestDetail>(`/change-requests/${id}/approve`, data)
      .then((r) => r.data),

  reject: (id: string, data: RejectChangeRequestRequest) =>
    client
      .post<ChangeRequestDetail>(`/change-requests/${id}/reject`, data)
      .then((r) => r.data),

  transition: (id: string, data: TransitionChangeRequestRequest) =>
    client
      .post<ChangeRequestDetail>(`/change-requests/${id}/transition`, data)
      .then((r) => r.data),

  getAllowedTransitions: (id: string) =>
    client
      .get<ChangeRequestStatus[]>(`/change-requests/${id}/transitions`)
      .then((r) => r.data),
}

export const cabVotesApi = {
  list: (changeRequestId: string) =>
    client
      .get<CABVote[]>(`/change-requests/${changeRequestId}/cab-votes`)
      .then((r) => r.data),
  cast: (changeRequestId: string, data: CABVoteCreate) =>
    client
      .post<CABVote>(`/change-requests/${changeRequestId}/cab-votes`, data)
      .then((r) => r.data),
}

export const changeScheduleApi = {
  get: (changeRequestId: string) =>
    client
      .get<ChangeSchedule>(`/change-requests/${changeRequestId}/schedule`)
      .then((r) => r.data),
  create: (changeRequestId: string, data: ChangeScheduleCreate) =>
    client
      .post<ChangeSchedule>(`/change-requests/${changeRequestId}/schedule`, data)
      .then((r) => r.data),
  update: (changeRequestId: string, data: ChangeScheduleCreate) =>
    client
      .put<ChangeSchedule>(`/change-requests/${changeRequestId}/schedule`, data)
      .then((r) => r.data),
  calendar: (from_date?: string, to_date?: string) =>
    client
      .get<ChangeScheduleCalendarItem[]>('/change-requests/schedules/calendar', {
        params: { from_date, to_date },
      })
      .then((r) => r.data),
}
