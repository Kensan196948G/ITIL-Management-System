import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DashboardPage } from '@/pages/dashboard'

const mockUseDashboardSummary = vi.fn()

vi.mock('@/hooks/use-dashboard', () => ({
  useDashboardSummary: () => mockUseDashboardSummary(),
}))

const MOCK_DATA = {
  incidents: {
    total: 10,
    open: 3,
    pending: 2,
    resolved: 5,
    closed: 0,
    by_priority: { p1_critical: 1, p2_high: 2, p3_medium: 4, p4_low: 3 },
  },
  service_requests: {
    total: 8,
    open: 2,
    approved: 3,
    completed: 3,
  },
  change_requests: {
    total: 5,
    draft: 1,
    in_review: 1,
    approved: 1,
    in_progress: 1,
    completed: 1,
  },
}

function renderWithRouter(ui: React.ReactNode) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('ローディング中にスピナーが表示されること', () => {
    mockUseDashboardSummary.mockReturnValue({ data: undefined, isLoading: true })
    renderWithRouter(<DashboardPage />)
    expect(screen.getByText('読み込み中...')).toBeInTheDocument()
  })

  it('データ取得後にダッシュボードタイトルが表示されること', () => {
    mockUseDashboardSummary.mockReturnValue({ data: MOCK_DATA, isLoading: false })
    renderWithRouter(<DashboardPage />)
    expect(screen.getByText('ダッシュボード')).toBeInTheDocument()
  })

  it('インシデント統計カードが表示されること', () => {
    mockUseDashboardSummary.mockReturnValue({ data: MOCK_DATA, isLoading: false })
    renderWithRouter(<DashboardPage />)
    expect(screen.getByText('インシデント管理')).toBeInTheDocument()
    expect(screen.getAllByText('合計').length).toBeGreaterThanOrEqual(1)
  })

  it('サービスリクエスト統計カードが表示されること', () => {
    mockUseDashboardSummary.mockReturnValue({ data: MOCK_DATA, isLoading: false })
    renderWithRouter(<DashboardPage />)
    expect(screen.getByText('サービスリクエスト管理')).toBeInTheDocument()
  })

  it('変更管理統計カードが表示されること', () => {
    mockUseDashboardSummary.mockReturnValue({ data: MOCK_DATA, isLoading: false })
    renderWithRouter(<DashboardPage />)
    expect(screen.getByText('変更管理')).toBeInTheDocument()
  })

  it('dataがundefinedの場合でもクラッシュしないこと', () => {
    mockUseDashboardSummary.mockReturnValue({ data: undefined, isLoading: false })
    renderWithRouter(<DashboardPage />)
    // Should still render headings without crashing
    expect(screen.getByText('ダッシュボード')).toBeInTheDocument()
  })

  it('各セクションの「一覧を見る」リンクが存在すること', () => {
    mockUseDashboardSummary.mockReturnValue({ data: MOCK_DATA, isLoading: false })
    renderWithRouter(<DashboardPage />)
    const links = screen.getAllByText('一覧を見る →')
    expect(links.length).toBeGreaterThanOrEqual(3)
  })
})
