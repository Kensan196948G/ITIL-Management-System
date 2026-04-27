import { apiClient } from './client'
import type { LoginRequest, RegisterRequest, TokenResponse, User } from '@/types/auth'

export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<TokenResponse>('/api/v1/auth/login', data),

  register: (data: RegisterRequest) =>
    apiClient.post<User>('/api/v1/auth/register', data),

  me: () =>
    apiClient.get<User>('/api/v1/auth/me'),

  refresh: (refreshToken: string) =>
    apiClient.post<TokenResponse>('/api/v1/auth/refresh', { refresh_token: refreshToken }),
}
