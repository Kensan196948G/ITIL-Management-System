import { client } from './client'
import type { PaginatedResponse } from '@/types'
import type {
  ApproveServiceRequestRequest,
  CreateServiceRequestRequest,
  RejectServiceRequestRequest,
  ServiceRequest,
  ServiceRequestCategory,
  ServiceRequestDetail,
  ServiceRequestStatus,
  TransitionServiceRequestRequest,
  UpdateServiceRequestRequest,
} from '@/types/service-request'

export interface ListServiceRequestsParams {
  status?: ServiceRequestStatus
  category?: ServiceRequestCategory
  requester_id?: string
  assignee_id?: string
  page?: number
  page_size?: number
}

export const serviceRequestsApi = {
  list: (params?: ListServiceRequestsParams) =>
    client
      .get<PaginatedResponse<ServiceRequest>>('/service-requests', { params })
      .then((r) => r.data),

  get: (id: string) =>
    client.get<ServiceRequestDetail>(`/service-requests/${id}`).then((r) => r.data),

  create: (data: CreateServiceRequestRequest) =>
    client.post<ServiceRequest>('/service-requests', data).then((r) => r.data),

  update: (id: string, data: UpdateServiceRequestRequest) =>
    client.put<ServiceRequest>(`/service-requests/${id}`, data).then((r) => r.data),

  approve: (id: string, data: ApproveServiceRequestRequest) =>
    client
      .post<ServiceRequestDetail>(`/service-requests/${id}/approve`, data)
      .then((r) => r.data),

  reject: (id: string, data: RejectServiceRequestRequest) =>
    client
      .post<ServiceRequestDetail>(`/service-requests/${id}/reject`, data)
      .then((r) => r.data),

  transition: (id: string, data: TransitionServiceRequestRequest) =>
    client
      .post<ServiceRequestDetail>(`/service-requests/${id}/transition`, data)
      .then((r) => r.data),

  getAllowedTransitions: (id: string) =>
    client
      .get<ServiceRequestStatus[]>(`/service-requests/${id}/transitions`)
      .then((r) => r.data),
}
