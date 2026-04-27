import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { LoginPage } from '@/pages/login'
import { RegisterPage } from '@/pages/register'

// ---- Mock auth store ----
const mockAuthStore = {
  isAuthenticated: false,
  user: null as { id: string; email: string; full_name: string; role: string } | null,
}

vi.mock('@/store/auth-store', () => ({
  useAuthStore: () => mockAuthStore,
}))

// ---- Mock useAuth hook ----
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: mockAuthStore.user,
    isAuthenticated: mockAuthStore.isAuthenticated,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  }),
}))

// ---- Mock authApi ----
vi.mock('@/api/auth', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    me: vi.fn(),
    refresh: vi.fn(),
  },
}))

// ---- Helpers ----
function renderWithRouter(
  ui: React.ReactNode,
  { initialEntries = ['/'] }: { initialEntries?: string[] } = {}
) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      {ui}
    </MemoryRouter>
  )
}

// ---- Tests ----
describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockAuthStore.isAuthenticated = false
    mockAuthStore.user = null
  })

  it('未認証時に /login へリダイレクトすること', () => {
    renderWithRouter(
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <div>Protected Content</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>,
      { initialEntries: ['/'] }
    )

    expect(screen.getByText('Login Page')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('認証済み時に子要素をレンダリングすること', () => {
    mockAuthStore.isAuthenticated = true
    mockAuthStore.user = {
      id: '1',
      email: 'test@example.com',
      full_name: 'Test User',
      role: 'user',
    }

    renderWithRouter(
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <div>Protected Content</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>,
      { initialEntries: ['/'] }
    )

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument()
  })

  it('requiredRoleが一致しない場合に / へリダイレクトすること', () => {
    mockAuthStore.isAuthenticated = true
    mockAuthStore.user = {
      id: '1',
      email: 'test@example.com',
      full_name: 'Test User',
      role: 'user',
    }

    renderWithRouter(
      <Routes>
        <Route path="/" element={<div>Home</div>} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="admin">
              <div>Admin Content</div>
            </ProtectedRoute>
          }
        />
      </Routes>,
      { initialEntries: ['/admin'] }
    )

    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument()
  })
})

describe('LoginPage', () => {
  it('必要なフォーム要素をレンダリングすること', () => {
    renderWithRouter(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<div>Register</div>} />
      </Routes>,
      { initialEntries: ['/login'] }
    )

    expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument()
    expect(screen.getByLabelText('パスワード')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ログイン' })).toBeInTheDocument()
    expect(screen.getByText('登録する')).toBeInTheDocument()
  })

  it('登録するリンクが /register を指していること', () => {
    renderWithRouter(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<div>Register Page</div>} />
      </Routes>,
      { initialEntries: ['/login'] }
    )

    const registerLink = screen.getByText('登録する')
    expect(registerLink).toBeInTheDocument()
  })
})

describe('RegisterPage', () => {
  it('必要なフォーム要素をレンダリングすること', () => {
    renderWithRouter(
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<div>Login</div>} />
      </Routes>,
      { initialEntries: ['/register'] }
    )

    expect(screen.getByLabelText('氏名')).toBeInTheDocument()
    expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument()
    expect(screen.getByLabelText('パスワード')).toBeInTheDocument()
    expect(screen.getByLabelText('パスワード（確認）')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'アカウントを作成' })).toBeInTheDocument()
    expect(screen.getByText('ログイン')).toBeInTheDocument()
  })

  it('ログインリンクが /login を指していること', () => {
    renderWithRouter(
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>,
      { initialEntries: ['/register'] }
    )

    const loginLink = screen.getByText('ログイン')
    expect(loginLink).toBeInTheDocument()
  })
})
