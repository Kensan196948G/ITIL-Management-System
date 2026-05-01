import { apiClient } from './client'
import type { LoginRequest, RegisterRequest, TokenResponse, User } from '@/types/auth'

export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<TokenResponse>('/auth/login', data),

  register: (data: RegisterRequest) =>
    apiClient.post<User>('/auth/register', data),

  me: () =>
    apiClient.get<User>('/auth/me'),

  refresh: (refreshToken: string) =>
    apiClient.post<TokenResponse>('/auth/refresh', { refresh_token: refreshToken }),
}
