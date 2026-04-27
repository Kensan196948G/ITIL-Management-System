import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ChangeRequestListPage } from '@/pages/change-requests/list'
import { ChangeRequestDetailPage } from '@/pages/change-requests/detail'

const mockUseChangeRequests = vi.fn()
const mockUseChangeRequest = vi.fn()
const mockUseAllowedTransitions = vi.fn()
const mockUseCABVotes = vi.fn()
const mockUseChangeSchedule = vi.fn()
const mockMutateAsync = vi.fn()

vi.mock('@/hooks/use-change-requests', () => ({
  useChangeRequests: () => mockUseChangeRequests(),
  useChangeRequest: () => mockUseChangeRequest(),
  useAllowedChangeRequestTransitions: () => mockUseAllowedTransitions(),
  useCreateChangeRequest: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateChangeRequest: () => ({ mutate: vi.fn(), isPending: false }),
  useApproveChangeRequest: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
  useRejectChangeRequest: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
  useTransitionChangeRequest: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
  useCABVotes: () => mockUseCABVotes(),
  useCastCABVote: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
  useChangeSchedule: () => mockUseChangeSchedule(),
  useCreateChangeSchedule: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
  useUpdateChangeSchedule: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
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
  reviewer_id: null,
  approver_id: null,
  implementer_id: null,
  planned_start_at: null,
  planned_end_at: null,
  actual_start_at: null,
  actual_end_at: null,
  approved_at: null,
  rejected_at: null,
  completed_at: null,
  rejection_reason: null,
  rollback_plan: null,
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  status_logs: [],
}

const MOCK_CAB_VOTE = {
  id: 'vote-0001-0002-0003-0004-0005',
  change_request_id: MOCK_CR.id,
  voter_id: 'voter-uuid-00000000',
  decision: 'approve' as const,
  comment: '問題なし',
  voted_at: '2024-01-15T11:00:00Z',
}

const MOCK_SCHEDULE = {
  id: 'sched-0001-0002-0003-0004-0005',
  change_request_id: MOCK_CR.id,
  scheduled_start: '2024-02-01T20:00:00Z',
  scheduled_end: '2024-02-01T22:00:00Z',
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
}

function renderDetailWithRouter(id = MOCK_CR.id) {
  return render(
    <MemoryRouter initialEntries={[`/change-requests/${id}`]}>
      <Routes>
        <Route path="/change-requests/:id" element={<ChangeRequestDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
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

describe('ChangeRequestDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseChangeRequest.mockReturnValue({ data: MOCK_CR, isLoading: false, isError: false })
    mockUseAllowedTransitions.mockReturnValue({ data: [], isLoading: false })
    mockUseCABVotes.mockReturnValue({ data: [], isLoading: false })
    mockUseChangeSchedule.mockReturnValue({ data: undefined, isError: true })
  })

  it('ローディング中に「読み込み中...」が表示されること', () => {
    mockUseChangeRequest.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    renderDetailWithRouter()
    expect(screen.getByText('読み込み中...')).toBeInTheDocument()
  })

  it('エラー時に「変更申請が見つかりません」が表示されること', () => {
    mockUseChangeRequest.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    renderDetailWithRouter()
    expect(screen.getByText('変更申請が見つかりません')).toBeInTheDocument()
  })

  it('変更申請のタイトルと説明が表示されること', () => {
    renderDetailWithRouter()
    expect(screen.getByText('DBスキーマ変更')).toBeInTheDocument()
    expect(screen.getByText('ユーザーテーブルにカラム追加')).toBeInTheDocument()
  })

  it('ステータスバッジが表示されること', () => {
    renderDetailWithRouter()
    expect(screen.getByText('提出済み')).toBeInTheDocument()
  })

  it('変更タイプとリスクレベルのバッジが表示されること', () => {
    renderDetailWithRouter()
    expect(screen.getByText('通常変更')).toBeInTheDocument()
    expect(screen.getByText('リスク: 中')).toBeInTheDocument()
  })

  it('「CAB投票」セクションが表示されること', () => {
    renderDetailWithRouter()
    expect(screen.getByText('CAB投票')).toBeInTheDocument()
  })

  it('投票がない場合「まだ投票はありません」が表示されること', () => {
    renderDetailWithRouter()
    expect(screen.getByText('まだ投票はありません')).toBeInTheDocument()
  })

  it('投票フォームのラジオボタンが表示されること', () => {
    renderDetailWithRouter()
    expect(screen.getByText('承認')).toBeInTheDocument()
    expect(screen.getByText('却下')).toBeInTheDocument()
    expect(screen.getByText('棄権')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '投票する' })).toBeInTheDocument()
  })

  it('CAB投票が存在する場合、投票が一覧表示されること', () => {
    mockUseCABVotes.mockReturnValue({ data: [MOCK_CAB_VOTE], isLoading: false })
    renderDetailWithRouter()
    expect(screen.getAllByText('承認').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('— 問題なし')).toBeInTheDocument()
  })

  it('投票集計バッジが表示されること', () => {
    mockUseCABVotes.mockReturnValue({ data: [MOCK_CAB_VOTE], isLoading: false })
    renderDetailWithRouter()
    expect(screen.getByText('承認: 1')).toBeInTheDocument()
  })

  it('「変更スケジュール」セクションが表示されること', () => {
    renderDetailWithRouter()
    expect(screen.getByText('変更スケジュール')).toBeInTheDocument()
  })

  it('スケジュール未設定の場合「スケジュール未設定」が表示されること', () => {
    renderDetailWithRouter()
    expect(screen.getByText('スケジュール未設定')).toBeInTheDocument()
  })

  it('スケジュール未設定時に「+ 設定」ボタンが表示されること', () => {
    renderDetailWithRouter()
    expect(screen.getByText('+ 設定')).toBeInTheDocument()
  })

  it('スケジュールが設定済みの場合は「編集」ボタンが表示されること', () => {
    mockUseChangeSchedule.mockReturnValue({ data: MOCK_SCHEDULE, isError: false })
    renderDetailWithRouter()
    expect(screen.getByText('編集')).toBeInTheDocument()
  })

  it('スケジュールが設定済みの場合は日時が表示されること', () => {
    mockUseChangeSchedule.mockReturnValue({ data: MOCK_SCHEDULE, isError: false })
    renderDetailWithRouter()
    expect(screen.getByText(/開始:/)).toBeInTheDocument()
    expect(screen.getByText(/終了:/)).toBeInTheDocument()
  })

  it('却下理由がある場合に表示されること', () => {
    mockUseChangeRequest.mockReturnValue({
      data: { ...MOCK_CR, rejection_reason: 'リスクが高すぎる' },
      isLoading: false,
      isError: false,
    })
    renderDetailWithRouter()
    expect(screen.getByText('リスクが高すぎる')).toBeInTheDocument()
  })
})
