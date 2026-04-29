import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ProblemListPage } from '@/pages/problems/list'
import { CreateProblemPage } from '@/pages/problems/create'
import { ProblemDetailPage } from '@/pages/problems/detail'

const mockUseProblems = vi.fn()
const mockUseProblem = vi.fn()
const mockUseProblemAllowedTransitions = vi.fn()
const mockMutateAsync = vi.fn()
const mockMutate = vi.fn()

vi.mock('@/hooks/use-problems', () => ({
  useProblems: () => mockUseProblems(),
  useProblem: () => mockUseProblem(),
  useProblemAllowedTransitions: () => mockUseProblemAllowedTransitions(),
  useCreateProblem: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
  useTransitionProblem: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
  useUnlinkIncident: () => ({ mutateAsync: mockMutate, isPending: false }),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => vi.fn() }
})

const MOCK_PROBLEM = {
  id: 'prob-0001-0002-0003-0004-0005',
  title: 'ネットワーク断続的切断',
  description: '本番ネットワークが断続的に切断される問題',
  status: 'open' as const,
  priority: 'p2_high' as const,
  is_known_error: false,
  assignee_id: null,
  root_cause: null,
  workaround: null,
  resolved_at: null,
  closed_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  status_logs: [],
  linked_incidents: [],
}

function renderWithRouter(ui: React.ReactNode, path = '/problems') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      {ui}
    </MemoryRouter>
  )
}

function renderDetailWithRouter(problemId: string) {
  return render(
    <MemoryRouter initialEntries={[`/problems/${problemId}`]}>
      <Routes>
        <Route path="/problems/:id" element={<ProblemDetailPage />} />
      </Routes>
    </MemoryRouter>
  )
}

// ─── ProblemListPage ────────────────────────────────────────────────────────

describe('ProblemListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('ローディング中に「読み込み中...」が表示されること', () => {
    mockUseProblems.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    renderWithRouter(<ProblemListPage />)
    expect(screen.getByText('読み込み中...')).toBeInTheDocument()
  })

  it('エラー時にエラーメッセージが表示されること', () => {
    mockUseProblems.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    renderWithRouter(<ProblemListPage />)
    expect(screen.getByText('データの取得に失敗しました')).toBeInTheDocument()
  })

  it('データが空の場合に「問題が見つかりません」が表示されること', () => {
    mockUseProblems.mockReturnValue({ data: { items: [], total: 0 }, isLoading: false, isError: false })
    renderWithRouter(<ProblemListPage />)
    expect(screen.getByText('問題が見つかりません')).toBeInTheDocument()
  })

  it('ページタイトル「問題管理」が表示されること', () => {
    mockUseProblems.mockReturnValue({ data: { items: [], total: 0 }, isLoading: false, isError: false })
    renderWithRouter(<ProblemListPage />)
    expect(screen.getByText('問題管理')).toBeInTheDocument()
  })

  it('「+ 新規作成」リンクが表示されること', () => {
    mockUseProblems.mockReturnValue({ data: { items: [], total: 0 }, isLoading: false, isError: false })
    renderWithRouter(<ProblemListPage />)
    expect(screen.getByText('+ 新規作成')).toBeInTheDocument()
  })

  it('問題アイテムがテーブルに表示されること', () => {
    mockUseProblems.mockReturnValue({
      data: { items: [MOCK_PROBLEM], total: 1 },
      isLoading: false,
      isError: false,
    })
    renderWithRouter(<ProblemListPage />)
    expect(screen.getByText('ネットワーク断続的切断')).toBeInTheDocument()
  })

  it('既知エラーフラグが有効な問題にはKEDBバッジが表示されること', () => {
    const knownErrorProblem = { ...MOCK_PROBLEM, is_known_error: true }
    mockUseProblems.mockReturnValue({
      data: { items: [knownErrorProblem], total: 1 },
      isLoading: false,
      isError: false,
    })
    renderWithRouter(<ProblemListPage />)
    expect(screen.getByText('KEDB')).toBeInTheDocument()
  })

  it('フィルターのステータスセレクトが表示されること', () => {
    mockUseProblems.mockReturnValue({ data: { items: [], total: 0 }, isLoading: false, isError: false })
    renderWithRouter(<ProblemListPage />)
    // "ステータス" appears as both filter label and table header
    expect(screen.getAllByText('ステータス').length).toBeGreaterThanOrEqual(2)
    // "すべて" appears in both status and priority filters
    expect(screen.getAllByText('すべて').length).toBeGreaterThanOrEqual(2)
  })

  it('フィルターの優先度セレクトが表示されること', () => {
    mockUseProblems.mockReturnValue({ data: { items: [], total: 0 }, isLoading: false, isError: false })
    renderWithRouter(<ProblemListPage />)
    // "優先度" appears as both filter label and table header — verify via option text
    expect(screen.getByText('P1 緊急')).toBeInTheDocument()
    expect(screen.getByText('P2 高')).toBeInTheDocument()
  })

  it('「既知エラーのみ」チェックボックスが表示されること', () => {
    mockUseProblems.mockReturnValue({ data: { items: [], total: 0 }, isLoading: false, isError: false })
    renderWithRouter(<ProblemListPage />)
    expect(screen.getByText('既知エラーのみ')).toBeInTheDocument()
    expect(screen.getByRole('checkbox')).toBeInTheDocument()
  })

  it('合計20件以下の場合ページネーションが表示されないこと', () => {
    mockUseProblems.mockReturnValue({
      data: { items: [MOCK_PROBLEM], total: 1 },
      isLoading: false,
      isError: false,
    })
    renderWithRouter(<ProblemListPage />)
    expect(screen.queryByText('前へ')).not.toBeInTheDocument()
  })

  it('合計21件以上の場合ページネーションが表示されること', () => {
    const items = Array.from({ length: 20 }, (_, i) => ({
      ...MOCK_PROBLEM,
      id: `prob-${i}`,
      title: `問題 ${i}`,
    }))
    mockUseProblems.mockReturnValue({
      data: { items, total: 21 },
      isLoading: false,
      isError: false,
    })
    renderWithRouter(<ProblemListPage />)
    expect(screen.getByText('前へ')).toBeInTheDocument()
    expect(screen.getByText('次へ')).toBeInTheDocument()
  })
})

// ─── CreateProblemPage ───────────────────────────────────────────────────────

describe('CreateProblemPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('「問題の新規作成」タイトルが表示されること', () => {
    renderWithRouter(<CreateProblemPage />)
    expect(screen.getByText('問題の新規作成')).toBeInTheDocument()
  })

  it('タイトル入力フィールドが表示されること', () => {
    renderWithRouter(<CreateProblemPage />)
    expect(screen.getByPlaceholderText('問題のタイトルを入力')).toBeInTheDocument()
  })

  it('説明テキストエリアが表示されること', () => {
    renderWithRouter(<CreateProblemPage />)
    expect(screen.getByPlaceholderText('問題の詳細を入力')).toBeInTheDocument()
  })

  it('優先度セレクトのデフォルトが「P3 中」であること', () => {
    renderWithRouter(<CreateProblemPage />)
    const select = screen.getByDisplayValue('P3 中')
    expect(select).toBeInTheDocument()
  })

  it('根本原因テキストエリアが表示されること', () => {
    renderWithRouter(<CreateProblemPage />)
    expect(screen.getByPlaceholderText('判明している根本原因があれば入力')).toBeInTheDocument()
  })

  it('回避策テキストエリアが表示されること', () => {
    renderWithRouter(<CreateProblemPage />)
    expect(screen.getByPlaceholderText('暫定的な回避策があれば入力')).toBeInTheDocument()
  })

  it('「作成」ボタンが表示されること', () => {
    renderWithRouter(<CreateProblemPage />)
    expect(screen.getByRole('button', { name: '作成' })).toBeInTheDocument()
  })

  it('「キャンセル」ボタンが表示されること', () => {
    renderWithRouter(<CreateProblemPage />)
    expect(screen.getByRole('button', { name: 'キャンセル' })).toBeInTheDocument()
  })

  it('「← 一覧に戻る」ボタンが表示されること', () => {
    renderWithRouter(<CreateProblemPage />)
    expect(screen.getByText('← 一覧に戻る')).toBeInTheDocument()
  })

  it('フォーム送信が失敗した場合にエラーメッセージが表示されること', async () => {
    mockMutateAsync.mockRejectedValueOnce(new Error('API Error'))
    renderWithRouter(<CreateProblemPage />)
    fireEvent.change(screen.getByPlaceholderText('問題のタイトルを入力'), {
      target: { value: 'テスト問題' },
    })
    fireEvent.change(screen.getByPlaceholderText('問題の詳細を入力'), {
      target: { value: 'テスト説明' },
    })
    fireEvent.submit(screen.getByRole('button', { name: '作成' }).closest('form')!)
    await screen.findByText('問題の作成に失敗しました')
  })
})

// ─── ProblemDetailPage ───────────────────────────────────────────────────────

describe('ProblemDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseProblemAllowedTransitions.mockReturnValue({ data: [], isLoading: false })
  })

  it('ローディング中に「読み込み中...」が表示されること', () => {
    mockUseProblem.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    renderDetailWithRouter('prob-0001-0002-0003-0004-0005')
    expect(screen.getByText('読み込み中...')).toBeInTheDocument()
  })

  it('エラー時に「問題が見つかりません」が表示されること', () => {
    mockUseProblem.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    renderDetailWithRouter('prob-0001-0002-0003-0004-0005')
    expect(screen.getByText('問題が見つかりません')).toBeInTheDocument()
  })

  it('問題のタイトルが表示されること', () => {
    mockUseProblem.mockReturnValue({ data: MOCK_PROBLEM, isLoading: false, isError: false })
    renderDetailWithRouter('prob-0001-0002-0003-0004-0005')
    expect(screen.getByText('ネットワーク断続的切断')).toBeInTheDocument()
  })

  it('問題の説明が表示されること', () => {
    mockUseProblem.mockReturnValue({ data: MOCK_PROBLEM, isLoading: false, isError: false })
    renderDetailWithRouter('prob-0001-0002-0003-0004-0005')
    expect(screen.getByText('本番ネットワークが断続的に切断される問題')).toBeInTheDocument()
  })

  it('遷移先がない場合に「この問題は変更できません」が表示されること', () => {
    mockUseProblem.mockReturnValue({ data: MOCK_PROBLEM, isLoading: false, isError: false })
    mockUseProblemAllowedTransitions.mockReturnValue({ data: [], isLoading: false })
    renderDetailWithRouter('prob-0001-0002-0003-0004-0005')
    expect(screen.getByText('この問題は変更できません')).toBeInTheDocument()
  })

  it('遷移先がある場合にステータス変更セレクトが表示されること', () => {
    mockUseProblem.mockReturnValue({ data: MOCK_PROBLEM, isLoading: false, isError: false })
    mockUseProblemAllowedTransitions.mockReturnValue({
      data: ['under_investigation', 'known_error'],
      isLoading: false,
    })
    renderDetailWithRouter('prob-0001-0002-0003-0004-0005')
    expect(screen.getByText('ステータス変更')).toBeInTheDocument()
    expect(screen.getByText('調査中')).toBeInTheDocument()
    expect(screen.getByText('既知エラー')).toBeInTheDocument()
  })

  it('「関連インシデント」セクションが表示されること', () => {
    mockUseProblem.mockReturnValue({ data: MOCK_PROBLEM, isLoading: false, isError: false })
    renderDetailWithRouter('prob-0001-0002-0003-0004-0005')
    expect(screen.getByText('関連インシデント')).toBeInTheDocument()
    expect(screen.getByText('関連インシデントなし')).toBeInTheDocument()
  })

  it('関連インシデントがある場合にリストが表示されること', () => {
    const problemWithIncident = {
      ...MOCK_PROBLEM,
      linked_incidents: [
        { id: 'inc-1234-5678-9012-3456-7890', title: 'ネットワーク障害インシデント' },
      ],
    }
    mockUseProblem.mockReturnValue({ data: problemWithIncident, isLoading: false, isError: false })
    renderDetailWithRouter('prob-0001-0002-0003-0004-0005')
    expect(screen.getByText('ネットワーク障害インシデント')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '解除' })).toBeInTheDocument()
  })

  it('既知エラーフラグが有効な問題にはKEDBバッジが表示されること', () => {
    const knownErrorProblem = { ...MOCK_PROBLEM, is_known_error: true }
    mockUseProblem.mockReturnValue({ data: knownErrorProblem, isLoading: false, isError: false })
    renderDetailWithRouter('prob-0001-0002-0003-0004-0005')
    expect(screen.getByText('既知エラー (KEDB)')).toBeInTheDocument()
  })

  it('根本原因がある場合に表示されること', () => {
    const problemWithRootCause = {
      ...MOCK_PROBLEM,
      root_cause: 'ルーターの設定ミスが原因',
    }
    mockUseProblem.mockReturnValue({ data: problemWithRootCause, isLoading: false, isError: false })
    renderDetailWithRouter('prob-0001-0002-0003-0004-0005')
    expect(screen.getByText('根本原因')).toBeInTheDocument()
    expect(screen.getByText('ルーターの設定ミスが原因')).toBeInTheDocument()
  })

  it('回避策がある場合に表示されること', () => {
    const problemWithWorkaround = {
      ...MOCK_PROBLEM,
      workaround: '別のルートを経由する',
    }
    mockUseProblem.mockReturnValue({ data: problemWithWorkaround, isLoading: false, isError: false })
    renderDetailWithRouter('prob-0001-0002-0003-0004-0005')
    expect(screen.getByText('回避策')).toBeInTheDocument()
    expect(screen.getByText('別のルートを経由する')).toBeInTheDocument()
  })

  it('ステータス履歴がある場合にセクションが表示されること', () => {
    const problemWithLogs = {
      ...MOCK_PROBLEM,
      status_logs: [
        {
          id: 'log-001',
          problem_id: MOCK_PROBLEM.id,
          from_status: null,
          to_status: 'open' as const,
          changed_by_id: 'user-001',
          comment: '新規作成',
          created_at: '2026-01-01T00:00:00Z',
        },
      ],
    }
    mockUseProblem.mockReturnValue({ data: problemWithLogs, isLoading: false, isError: false })
    renderDetailWithRouter('prob-0001-0002-0003-0004-0005')
    expect(screen.getByText('ステータス履歴')).toBeInTheDocument()
    expect(screen.getByText(/新規作成/)).toBeInTheDocument()
  })
})
