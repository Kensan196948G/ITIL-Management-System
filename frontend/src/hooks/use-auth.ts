import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth-store'
import { authApi } from '@/api/auth'
import type { LoginRequest, RegisterRequest } from '@/types/auth'

export function useAuth() {
  const { user, isAuthenticated, setAuth, clearAuth } = useAuthStore()
  const navigate = useNavigate()

  const login = useCallback(
    async (data: LoginRequest) => {
      const tokenRes = await authApi.login(data)
      localStorage.setItem('access_token', tokenRes.data.access_token)
      localStorage.setItem('refresh_token', tokenRes.data.refresh_token)
      const userRes = await authApi.me()
      setAuth(userRes.data, tokenRes.data.access_token)
      navigate('/')
    },
    [setAuth, navigate]
  )

  const register = useCallback(
    async (data: RegisterRequest) => {
      await authApi.register(data)
      await login({ email: data.email, password: data.password })
    },
    [login]
  )

  const logout = useCallback(() => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    clearAuth()
    navigate('/login')
  }, [clearAuth, navigate])

  return { user, isAuthenticated, login, register, logout }
}
