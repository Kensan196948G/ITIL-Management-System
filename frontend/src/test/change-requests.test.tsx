import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ChangeRequestListPage } from '@/pages/change-requests/list'

const mockUseChangeRequests = vi.fn()

vi.mock('@/hooks/use-change-requests', () => ({
  useChangeRequests: () => mockUseChangeRequests(),
  useCreateChangeRequest: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateChangeRequest: () => ({ mutate: vi.fn(), isPending: false }),
  useTransitionChangeRequest: () => ({ mutate: vi.fn(), isPending: false }),
}))

const MOCK_CR = {
  id: 'cr123456-0000-0000-0000-000000000000',
  title: 'DBスキーマ変更',
  description: 'ユーザーテーブルにカラム追加',
  status: 'submitted' as const,
  change_type: 'normal' as const,
  risk_level: 'medium' as const,
  priority: 'high' as const,
  requester_id: 'user1',
  approver_id: null,
  assignee_id: null,
  planned_start_at: null,
  planned_end_at: null,
  actual_start_at: null,
  actual_end_at: null,
  rejection_reason: null,
  rollback_plan: null,
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
}

function renderWithRouter(ui: React.ReactNode) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('ChangeRequestListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('ローディング中に「読み込み中...」が表示されること', () => {
    mockUseChangeRequests.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    renderWithRouter(<ChangeRequestListPage />)
    expect(screen.getByText('読み込み中...')).toBeInTheDocument()
  })

  it('エラー時にエラーメッセージが表示されること', () => {
    mockUseChangeRequests.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    renderWithRouter(<ChangeRequestListPage />)
    expect(screen.getByText('データの取得に失敗しました')).toBeInTheDocument()
  })

  it('データが空の場合に空状態メッセージが表示されること', () => {
    mockUseChangeRequests.mockReturnValue({
      data: { items: [], total: 0 },
      isLoading: false,
      isError: false,
    })
    renderWithRouter(<ChangeRequestListPage />)
    expect(screen.getByText('変更申請が見つかりません')).toBeInTheDocument()
  })

  it('ページタイトル「変更管理」が表示されること', () => {
    mockUseChangeRequests.mockReturnValue({ data: { items: [], total: 0 }, isLoading: false, isError: false })
    renderWithRouter(<ChangeRequestListPage />)
    expect(screen.getByText('変更管理')).toBeInTheDocument()
  })

  it('「+ 変更申請」ボタンが存在すること', () => {
    mockUseChangeRequests.mockReturnValue({ data: { items: [], total: 0 }, isLoading: false, isError: false })
    renderWithRouter(<ChangeRequestListPage />)
    const link = screen.getByRole('link', { name: /変更申請/ })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/change-requests/new')
  })

  it('変更申請一覧が表示されること', () => {
    mockUseChangeRequests.mockReturnValue({
      data: { items: [MOCK_CR], total: 1 },
      isLoading: false,
      isError: false,
    })
    renderWithRouter(<ChangeRequestListPage />)
    expect(screen.getByText('DBスキーマ変更')).toBeInTheDocument()
  })

  it('ステータス・変更タイプ・リスクレベルのフィルタが存在すること', () => {
    mockUseChangeRequests.mockReturnValue({ data: { items: [], total: 0 }, isLoading: false, isError: false })
    renderWithRouter(<ChangeRequestListPage />)
    expect(screen.getAllByText('ステータス').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('変更タイプ').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('リスクレベル').length).toBeGreaterThanOrEqual(1)
  })

  it('変更申請タイトルが詳細ページへのリンクになっていること', () => {
    mockUseChangeRequests.mockReturnValue({
      data: { items: [MOCK_CR], total: 1 },
      isLoading: false,
      isError: false,
    })
    renderWithRouter(<ChangeRequestListPage />)
    const link = screen.getByRole('link', { name: 'DBスキーマ変更' })
    expect(link).toHaveAttribute('href', `/change-requests/${MOCK_CR.id}`)
  })
})
