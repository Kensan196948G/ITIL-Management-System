import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AdminUsersPage } from '@/pages/admin/users'
import { AuditLogsPage } from '@/pages/admin/audit-logs'
import { ProfilePage } from '@/pages/profile'

const mockUseUserList = vi.fn()
const mockUseUpdateUser = vi.fn()
const mockUseAuditLogs = vi.fn()

vi.mock('@/hooks/use-users', () => ({
  useUserList: () => mockUseUserList(),
  useUser: () => ({ data: undefined, isLoading: false }),
  useUpdateUser: () => mockUseUpdateUser(),
  useAuditLogs: () => mockUseAuditLogs(),
}))

const mockAuthStore = {
  isAuthenticated: true,
  user: {
    id: 'admin-id',
    email: 'admin@example.com',
    full_name: '管理者ユーザー',
    role: 'admin',
  },
}

vi.mock('@/store/auth-store', () => ({
  useAuthStore: (selector?: (s: typeof mockAuthStore) => unknown) =>
    selector ? selector(mockAuthStore) : mockAuthStore,
}))

const MOCK_USER = {
  id: 'user-123',
  email: 'user@example.com',
  full_name: '田中 太郎',
  role: 'user' as const,
  is_active: true,
  created_at: '2024-01-10T00:00:00Z',
  updated_at: '2024-01-10T00:00:00Z',
}

const MOCK_AUDIT_LOG = {
  id: 'log-123',
  table_name: 'incidents',
  record_id: 'rec-uuid-1234-5678',
  action: 'CREATE',
  user_id: 'user-uuid-abcd',
  changes: { title: 'テスト' },
  created_at: '2024-01-15T10:00:00Z',
}

function renderWithRouter(ui: React.ReactNode) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('AdminUsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseUpdateUser.mockReturnValue({ mutate: vi.fn(), isPending: false })
  })

  it('ローディング中に「読み込み中...」が表示されること', () => {
    mockUseUserList.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    renderWithRouter(<AdminUsersPage />)
    expect(screen.getByText('読み込み中...')).toBeInTheDocument()
  })

  it('エラー時にエラーメッセージが表示されること', () => {
    mockUseUserList.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    renderWithRouter(<AdminUsersPage />)
    expect(screen.getByText('ユーザー一覧の取得に失敗しました。')).toBeInTheDocument()
  })

  it('ページタイトル「ユーザー管理」が表示されること', () => {
    mockUseUserList.mockReturnValue({ data: [], isLoading: false, isError: false })
    renderWithRouter(<AdminUsersPage />)
    expect(screen.getByText('ユーザー管理')).toBeInTheDocument()
  })

  it('ユーザーリストが表示されること', () => {
    mockUseUserList.mockReturnValue({ data: [MOCK_USER], isLoading: false, isError: false })
    renderWithRouter(<AdminUsersPage />)
    expect(screen.getByText('田中 太郎')).toBeInTheDocument()
    expect(screen.getByText('user@example.com')).toBeInTheDocument()
  })

  it('ユーザーのロールバッジが表示されること', () => {
    mockUseUserList.mockReturnValue({ data: [MOCK_USER], isLoading: false, isError: false })
    renderWithRouter(<AdminUsersPage />)
    expect(screen.getByText('一般ユーザー')).toBeInTheDocument()
  })

  it('有効なユーザーのステータスバッジが「有効」であること', () => {
    mockUseUserList.mockReturnValue({ data: [MOCK_USER], isLoading: false, isError: false })
    renderWithRouter(<AdminUsersPage />)
    expect(screen.getByText('有効')).toBeInTheDocument()
  })

  it('ユーザーが0件の場合に空状態メッセージが表示されること', () => {
    mockUseUserList.mockReturnValue({ data: [], isLoading: false, isError: false })
    renderWithRouter(<AdminUsersPage />)
    expect(screen.getByText('ユーザーが見つかりません')).toBeInTheDocument()
  })
})

describe('AuditLogsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('ページタイトル「監査ログ」が表示されること', () => {
    mockUseAuditLogs.mockReturnValue({ data: undefined, isLoading: false, isError: false })
    renderWithRouter(<AuditLogsPage />)
    expect(screen.getByText('監査ログ')).toBeInTheDocument()
  })

  it('ローディング中に「読み込み中...」が表示されること', () => {
    mockUseAuditLogs.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    renderWithRouter(<AuditLogsPage />)
    expect(screen.getByText('読み込み中...')).toBeInTheDocument()
  })

  it('エラー時にエラーメッセージが表示されること', () => {
    mockUseAuditLogs.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    renderWithRouter(<AuditLogsPage />)
    expect(screen.getByText('監査ログの取得に失敗しました。')).toBeInTheDocument()
  })

  it('監査ログが表示されること', () => {
    mockUseAuditLogs.mockReturnValue({ data: [MOCK_AUDIT_LOG], isLoading: false, isError: false })
    renderWithRouter(<AuditLogsPage />)
    expect(screen.getByText('incidents')).toBeInTheDocument()
    expect(screen.getByText('CREATE')).toBeInTheDocument()
  })

  it('対象テーブルと操作種別のフィルタが存在すること', () => {
    mockUseAuditLogs.mockReturnValue({ data: [], isLoading: false, isError: false })
    renderWithRouter(<AuditLogsPage />)
    expect(screen.getByText('対象テーブル')).toBeInTheDocument()
    expect(screen.getByText('操作種別')).toBeInTheDocument()
  })

  it('ログが0件の場合に空状態メッセージが表示されること', () => {
    mockUseAuditLogs.mockReturnValue({ data: [], isLoading: false, isError: false })
    renderWithRouter(<AuditLogsPage />)
    expect(screen.getByText('監査ログが見つかりません')).toBeInTheDocument()
  })
})

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseUpdateUser.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
    })
    mockAuthStore.user = {
      id: 'admin-id',
      email: 'admin@example.com',
      full_name: '管理者ユーザー',
      role: 'admin',
    }
  })

  it('ページタイトル「プロフィール」が表示されること', () => {
    renderWithRouter(<ProfilePage />)
    expect(screen.getByText('プロフィール')).toBeInTheDocument()
  })

  it('ユーザー名とメールアドレスが表示されること', () => {
    renderWithRouter(<ProfilePage />)
    expect(screen.getAllByText('管理者ユーザー').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('admin@example.com').length).toBeGreaterThanOrEqual(1)
  })

  it('ロールバッジが表示されること', () => {
    renderWithRouter(<ProfilePage />)
    expect(screen.getByText('管理者')).toBeInTheDocument()
  })

  it('「編集」ボタンが存在すること', () => {
    renderWithRouter(<ProfilePage />)
    expect(screen.getByRole('button', { name: '編集' })).toBeInTheDocument()
  })

  it('userがnullの場合にエラーメッセージが表示されること', () => {
    mockAuthStore.user = null as unknown as typeof mockAuthStore.user
    renderWithRouter(<ProfilePage />)
    expect(screen.getByText('ユーザー情報を取得できません。')).toBeInTheDocument()
  })
})
