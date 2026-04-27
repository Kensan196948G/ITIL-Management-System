import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ApprovalsPage } from '@/pages/approvals'

const mockUseServiceRequests = vi.fn()
const mockUseChangeRequests = vi.fn()

vi.mock('@/hooks/use-service-requests', () => ({
  useServiceRequests: () => mockUseServiceRequests(),
}))

vi.mock('@/hooks/use-change-requests', () => ({
  useChangeRequests: () => mockUseChangeRequests(),
})
)

const EMPTY_RESULT = { data: { items: [], total: 0 }, isLoading: false, isError: false }
const LOADING_RESULT = { data: undefined, isLoading: true, isError: false }
const ERROR_RESULT = { data: undefined, isLoading: false, isError: true }

const MOCK_SR = {
  id: 'sr-pending-id',
  title: '承認待ちSR',
  description: '説明',
  status: 'pending_approval' as const,
  category: 'it_equipment' as const,
  requester_id: 'u1',
  approver_id: null,
  assignee_id: null,
  due_date: null,
  approved_at: null,
  rejected_at: null,
  completed_at: null,
  rejection_reason: null,
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
}

const MOCK_CR = {
  id: 'cr-submitted-id',
  title: '提出済みCR',
  description: '説明',
  status: 'submitted' as const,
  change_type: 'normal' as const,
  risk_level: 'low' as const,
  priority: 'medium' as const,
  requester_id: 'u1',
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

describe('ApprovalsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseServiceRequests.mockReturnValue(EMPTY_RESULT)
    mockUseChangeRequests.mockReturnValue(EMPTY_RESULT)
  })

  it('ページタイトル「承認キュー」が表示されること', () => {
    renderWithRouter(<ApprovalsPage />)
    expect(screen.getByText('承認キュー')).toBeInTheDocument()
  })

  it('ローディング中に「読み込み中...」が表示されること', () => {
    mockUseServiceRequests.mockReturnValue(LOADING_RESULT)
    mockUseChangeRequests.mockReturnValue(LOADING_RESULT)
    renderWithRouter(<ApprovalsPage />)
    expect(screen.getByText('読み込み中...')).toBeInTheDocument()
  })

  it('エラー時にエラーメッセージが表示されること', () => {
    mockUseServiceRequests.mockReturnValue(ERROR_RESULT)
    mockUseChangeRequests.mockReturnValue(ERROR_RESULT)
    renderWithRouter(<ApprovalsPage />)
    expect(screen.getByText('データの取得に失敗しました')).toBeInTheDocument()
  })

  it('全て・サービスリクエスト・変更管理のタブが存在すること', () => {
    renderWithRouter(<ApprovalsPage />)
    expect(screen.getByRole('button', { name: /全て/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /サービスリクエスト/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /変更管理/ })).toBeInTheDocument()
  })

  it('承認待ちアイテムがない場合に空状態メッセージが表示されること', () => {
    renderWithRouter(<ApprovalsPage />)
    expect(screen.getByText('承認待ちのリクエストはありません')).toBeInTheDocument()
  })

  it('承認待ちSRが表示されること', () => {
    mockUseServiceRequests.mockReturnValue({
      data: { items: [MOCK_SR], total: 1 },
      isLoading: false,
      isError: false,
    })
    mockUseChangeRequests.mockReturnValue(EMPTY_RESULT)
    renderWithRouter(<ApprovalsPage />)
    expect(screen.getByText('承認待ちSR')).toBeInTheDocument()
  })

  it('承認待ちCRが表示されること', () => {
    mockUseServiceRequests.mockReturnValue(EMPTY_RESULT)
    mockUseChangeRequests.mockReturnValue({
      data: { items: [MOCK_CR], total: 1 },
      isLoading: false,
      isError: false,
    })
    renderWithRouter(<ApprovalsPage />)
    expect(screen.getAllByText('提出済みCR').length).toBeGreaterThanOrEqual(1)
  })

  it('SRタブに切り替えると空状態メッセージが変わること', async () => {
    renderWithRouter(<ApprovalsPage />)
    await userEvent.click(screen.getByRole('button', { name: /サービスリクエスト/ }))
    expect(screen.getByText('承認待ちのサービスリクエストはありません')).toBeInTheDocument()
  })

  it('変更管理タブに切り替えると空状態メッセージが変わること', async () => {
    renderWithRouter(<ApprovalsPage />)
    await userEvent.click(screen.getByRole('button', { name: /変更管理/ }))
    expect(screen.getByText('承認待ちの変更リクエストはありません')).toBeInTheDocument()
  })
})
