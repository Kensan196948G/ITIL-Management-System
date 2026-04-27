import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { AppRouter } from '../router'

// Mock auth store - unauthenticated by default to test redirect to login
vi.mock('@/store/auth-store', () => ({
  useAuthStore: () => ({
    isAuthenticated: false,
    user: null,
    clearAuth: vi.fn(),
  }),
}))

// Mock useAuth hook
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  }),
}))

// Mock authApi
vi.mock('@/api/auth', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    me: vi.fn(),
    refresh: vi.fn(),
  },
}))

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('App Router', () => {
  it('renders login page when unauthenticated', () => {
    render(
      <TestWrapper>
        <MemoryRouter initialEntries={['/login']}>
          <AppRouter />
        </MemoryRouter>
      </TestWrapper>
    )
    // Login page has the app name as heading
    const headings = screen.getAllByText('ITIL Management System')
    expect(headings.length).toBeGreaterThan(0)
  })
})
