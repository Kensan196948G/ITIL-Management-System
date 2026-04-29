import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ServiceRequestListPage } from '@/pages/service-requests/list'

const mockUseServiceRequests = vi.fn()

vi.mock('@/hooks/use-service-requests', () => ({
  useServiceRequests: () => mockUseServiceRequests(),
  useCreateServiceRequest: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateServiceRequest: () => ({ mutate: vi.fn(), isPending: false }),
  useTransitionServiceRequest: () => ({ mutate: vi.fn(), isPending: false }),
}))

const MOCK_SR = {
  id: 'sr123456-0000-0000-0000-000000000000',
  title: 'ノートPC申請',
  description: '新入社員用',
  status: 'submitted' as const,
  category: 'it_equipment' as const,
  requester_id: 'user1',
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

function renderWithRouter(ui: React.ReactNode) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('ServiceRequestListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('ローディング中に「読み込み中...」が表示されること', () => {
    mockUseServiceRequests.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    renderWithRouter(<ServiceRequestListPage />)
    expect(screen.getByText('読み込み中...')).toBeInTheDocument()
  })

  it('エラー時にエラーメッセージが表示されること', () => {
    mockUseServiceRequests.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    renderWithRouter(<ServiceRequestListPage />)
    expect(screen.getByText('データの取得に失敗しました')).toBeInTheDocument()
  })

  it('データが空の場合に空状態メッセージが表示されること', () => {
    mockUseServiceRequests.mockReturnValue({
      data: { items: [], total: 0 },
      isLoading: false,
      isError: false,
    })
    renderWithRouter(<ServiceRequestListPage />)
    expect(screen.getByText('サービスリクエストが見つかりません')).toBeInTheDocument()
  })

  it('ページタイトルが表示されること', () => {
    mockUseServiceRequests.mockReturnValue({ data: { items: [], total: 0 }, isLoading: false, isError: false })
    renderWithRouter(<ServiceRequestListPage />)
    expect(screen.getByText('サービスリクエスト管理')).toBeInTheDocument()
  })

  it('「+ 新規リクエスト」ボタンが存在すること', () => {
    mockUseServiceRequests.mockReturnValue({ data: { items: [], total: 0 }, isLoading: false, isError: false })
    renderWithRouter(<ServiceRequestListPage />)
    const link = screen.getByRole('link', { name: /新規リクエスト/ })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/service-requests/new')
  })

  it('サービスリクエスト一覧が表示されること', () => {
    mockUseServiceRequests.mockReturnValue({
      data: { items: [MOCK_SR], total: 1 },
      isLoading: false,
      isError: false,
    })
    renderWithRouter(<ServiceRequestListPage />)
    expect(screen.getByText('ノートPC申請')).toBeInTheDocument()
  })

  it('ステータスとカテゴリのフィルタが存在すること', () => {
    mockUseServiceRequests.mockReturnValue({ data: { items: [], total: 0 }, isLoading: false, isError: false })
    renderWithRouter(<ServiceRequestListPage />)
    expect(screen.getAllByText('ステータス').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('カテゴリ').length).toBeGreaterThanOrEqual(1)
  })

  it('リクエストタイトルが詳細ページへのリンクになっていること', () => {
    mockUseServiceRequests.mockReturnValue({
      data: { items: [MOCK_SR], total: 1 },
      isLoading: false,
      isError: false,
    })
    renderWithRouter(<ServiceRequestListPage />)
    const link = screen.getByRole('link', { name: 'ノートPC申請' })
    expect(link).toHaveAttribute('href', `/service-requests/${MOCK_SR.id}`)
  })
})
