import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { IncidentListPage } from '@/pages/incidents/list'
import { CreateIncidentPage } from '@/pages/incidents/create'

const mockUseIncidents = vi.fn()
const mockUseCreateIncident = vi.fn()

vi.mock('@/hooks/use-incidents', () => ({
  useIncidents: () => mockUseIncidents(),
  useCreateIncident: () => mockUseCreateIncident(),
}))

const MOCK_INCIDENT = {
  id: 'abc12345-0000-0000-0000-000000000000',
  title: 'サーバー障害',
  status: 'new' as const,
  priority: 'p1_critical' as const,
  description: 'テスト説明',
  category: 'network',
  reporter_id: 'user1',
  assignee_id: null,
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  resolved_at: null,
  closed_at: null,
}

function renderWithRouter(
  ui: React.ReactNode,
  { initialEntries = ['/'] }: { initialEntries?: string[] } = {}
) {
  return render(<MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>)
}

describe('IncidentListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('ローディング中に「読み込み中...」が表示されること', () => {
    mockUseIncidents.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    renderWithRouter(<IncidentListPage />)
    expect(screen.getByText('読み込み中...')).toBeInTheDocument()
  })

  it('エラー時にエラーメッセージが表示されること', () => {
    mockUseIncidents.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    renderWithRouter(<IncidentListPage />)
    expect(screen.getByText('データの取得に失敗しました')).toBeInTheDocument()
  })

  it('データが空の場合に「インシデントが見つかりません」が表示されること', () => {
    mockUseIncidents.mockReturnValue({
      data: { items: [], total: 0 },
      isLoading: false,
      isError: false,
    })
    renderWithRouter(<IncidentListPage />)
    expect(screen.getByText('インシデントが見つかりません')).toBeInTheDocument()
  })

  it('インシデント一覧が表示されること', () => {
    mockUseIncidents.mockReturnValue({
      data: { items: [MOCK_INCIDENT], total: 1 },
      isLoading: false,
      isError: false,
    })
    renderWithRouter(<IncidentListPage />)
    expect(screen.getByText('サーバー障害')).toBeInTheDocument()
  })

  it('ページタイトル「インシデント管理」が表示されること', () => {
    mockUseIncidents.mockReturnValue({ data: { items: [], total: 0 }, isLoading: false, isError: false })
    renderWithRouter(<IncidentListPage />)
    expect(screen.getByText('インシデント管理')).toBeInTheDocument()
  })

  it('「+ 新規作成」ボタンが存在すること', () => {
    mockUseIncidents.mockReturnValue({ data: { items: [], total: 0 }, isLoading: false, isError: false })
    renderWithRouter(<IncidentListPage />)
    const createLink = screen.getByRole('link', { name: /新規作成/ })
    expect(createLink).toBeInTheDocument()
    expect(createLink).toHaveAttribute('href', '/incidents/new')
  })

  it('ステータスフィルタのセレクトボックスが存在すること', () => {
    mockUseIncidents.mockReturnValue({ data: { items: [], total: 0 }, isLoading: false, isError: false })
    renderWithRouter(<IncidentListPage />)
    expect(screen.getAllByText('ステータス').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('優先度').length).toBeGreaterThanOrEqual(1)
  })

  it('インシデントタイトルが詳細ページへのリンクになっていること', () => {
    mockUseIncidents.mockReturnValue({
      data: { items: [MOCK_INCIDENT], total: 1 },
      isLoading: false,
      isError: false,
    })
    renderWithRouter(<IncidentListPage />)
    const link = screen.getByRole('link', { name: 'サーバー障害' })
    expect(link).toHaveAttribute('href', `/incidents/${MOCK_INCIDENT.id}`)
  })
})

describe('CreateIncidentPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseCreateIncident.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ id: 'new-id' }),
      isPending: false,
    })
  })

  it('インシデント登録フォームが表示されること', () => {
    renderWithRouter(<CreateIncidentPage />)
    expect(screen.getByText('インシデント登録')).toBeInTheDocument()
  })

  it('必要なフォームフィールドが表示されること', () => {
    renderWithRouter(<CreateIncidentPage />)
    expect(screen.getByText('タイトル')).toBeInTheDocument()
    expect(screen.getByText('説明')).toBeInTheDocument()
    expect(screen.getByText('優先度')).toBeInTheDocument()
    expect(screen.getByText('カテゴリ')).toBeInTheDocument()
  })

  it('「登録する」ボタンが存在すること', () => {
    renderWithRouter(<CreateIncidentPage />)
    expect(screen.getByRole('button', { name: '登録する' })).toBeInTheDocument()
  })

  it('ローディング中に「登録中...」が表示されること', () => {
    mockUseCreateIncident.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: true,
    })
    renderWithRouter(<CreateIncidentPage />)
    expect(screen.getByRole('button', { name: '登録中...' })).toBeInTheDocument()
  })

  it('フォーム送信時にmutateAsyncが呼ばれること', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ id: 'new-id' })
    mockUseCreateIncident.mockReturnValue({ mutateAsync, isPending: false })

    renderWithRouter(
      <Routes>
        <Route path="/" element={<CreateIncidentPage />} />
        <Route path="/incidents/:id" element={<div>詳細</div>} />
      </Routes>
    )

    await userEvent.type(screen.getByPlaceholderText('インシデントの概要を入力してください'), 'テストタイトル')
    await userEvent.type(screen.getByPlaceholderText('詳細な説明を入力してください'), 'テスト説明文')
    await userEvent.click(screen.getByRole('button', { name: '登録する' }))

    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'テストタイトル', description: 'テスト説明文' })
    )
  })
})
