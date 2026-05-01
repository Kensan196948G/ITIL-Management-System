import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Track if we are currently refreshing to prevent infinite loops
let isRefreshing = false
let failedQueue: Array<{
  resolve: (value: unknown) => void
  reject: (reason?: unknown) => void
}> = []

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error)
    } else {
      resolve(token)
    }
  })
  failedQueue = []
}

function extractErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const err = error as { response?: { data?: { message?: string; detail?: string } }; message?: string }
    return err.response?.data?.message || err.response?.data?.detail || err.message || '予期せぬエラーが発生しました'
  }
  return '予期せぬエラーが発生しました'
}

export { extractErrorMessage }

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (!error.response) {
      return Promise.reject(new Error('ネットワーク接続を確認してください'))
    }

    if (error.response.status === 429) {
      return Promise.reject(new Error('リクエストが多すぎます。しばらく待ってから再試行してください'))
    }

    // If the error is not 401, or it's the refresh endpoint itself, reject immediately
    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url?.includes('/auth/refresh')
    ) {
      error.userMessage = extractErrorMessage(error)
      return Promise.reject(error)
    }

    const refreshToken = localStorage.getItem('refresh_token')
    if (!refreshToken) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      window.location.href = '/login'
      return Promise.reject(error)
    }

    if (isRefreshing) {
      // Queue the request until the token is refreshed
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return apiClient(originalRequest)
        })
        .catch((err) => Promise.reject(err))
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      const response = await axios.post<{ access_token: string; refresh_token: string; token_type: string }>(
        `${BASE_URL}/auth/refresh`,
        { refresh_token: refreshToken },
        { headers: { 'Content-Type': 'application/json' } }
      )

      const { access_token, refresh_token: newRefreshToken } = response.data

      localStorage.setItem('access_token', access_token)
      localStorage.setItem('refresh_token', newRefreshToken)

      // Update stored token in Zustand store
      try {
        const { useAuthStore } = await import('@/store/auth-store')
        const state = useAuthStore.getState()
        if (state.user) {
          state.setAuth(state.user, access_token)
        }
      } catch {
        // Ignore store update errors
      }

      apiClient.defaults.headers.common.Authorization = `Bearer ${access_token}`
      processQueue(null, access_token)

      originalRequest.headers.Authorization = `Bearer ${access_token}`
      return apiClient(originalRequest)
    } catch (refreshError) {
      processQueue(refreshError, null)
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      window.location.href = '/login'
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }
)

export const client = apiClient
