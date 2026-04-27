import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ServiceCatalogPage } from '@/pages/service-requests/catalog'

const mockUseServiceCatalog = vi.fn()
const mockMutateAsync = vi.fn()

vi.mock('@/hooks/use-service-requests', () => ({
  useServiceCatalog: () => mockUseServiceCatalog(),
  useCreateServiceRequest: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => vi.fn() }
})

const MOCK_ITEM = {
  id: 'cat-item-1',
  name: 'ノートPC申請',
  description: '業務用ノートPCの申請',
  category: 'it_equipment' as const,
  estimated_days: 5,
  requires_approval: true,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

function renderWithRouter(ui: React.ReactNode) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('ServiceCatalogPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('ローディング中に「読み込み中...」が表示されること', () => {
    mockUseServiceCatalog.mockReturnValue({ data: [], isLoading: true, isError: false })
    renderWithRouter(<ServiceCatalogPage />)
    expect(screen.getByText('読み込み中...')).toBeInTheDocument()
  })

  it('エラー時にエラーメッセージが表示されること', () => {
    mockUseServiceCatalog.mockReturnValue({ data: [], isLoading: false, isError: true })
    renderWithRouter(<ServiceCatalogPage />)
    expect(screen.getByText(/読み込みに失敗/)).toBeInTheDocument()
  })

  it('データが空の場合に空状態メッセージが表示されること', () => {
    mockUseServiceCatalog.mockReturnValue({ data: [], isLoading: false, isError: false })
    renderWithRouter(<ServiceCatalogPage />)
    expect(screen.getByText('利用可能なサービスがありません')).toBeInTheDocument()
  })

  it('ページタイトルが表示されること', () => {
    mockUseServiceCatalog.mockReturnValue({ data: [], isLoading: false, isError: false })
    renderWithRouter(<ServiceCatalogPage />)
    expect(screen.getByText('サービスカタログ')).toBeInTheDocument()
  })

  it('カタログアイテムが表示されること', () => {
    mockUseServiceCatalog.mockReturnValue({
      data: [MOCK_ITEM],
      isLoading: false,
      isError: false,
    })
    renderWithRouter(<ServiceCatalogPage />)
    expect(screen.getByText('ノートPC申請')).toBeInTheDocument()
    expect(screen.getByText('業務用ノートPCの申請')).toBeInTheDocument()
    expect(screen.getByText('目安: 5日')).toBeInTheDocument()
    expect(screen.getByText('承認必要')).toBeInTheDocument()
  })

  it('「申請する」ボタンが各カードに表示されること', () => {
    mockUseServiceCatalog.mockReturnValue({
      data: [MOCK_ITEM],
      isLoading: false,
      isError: false,
    })
    renderWithRouter(<ServiceCatalogPage />)
    expect(screen.getByRole('button', { name: '申請する' })).toBeInTheDocument()
  })

  it('「申請する」をクリックするとモーダルが表示されること', () => {
    mockUseServiceCatalog.mockReturnValue({
      data: [MOCK_ITEM],
      isLoading: false,
      isError: false,
    })
    renderWithRouter(<ServiceCatalogPage />)
    fireEvent.click(screen.getByRole('button', { name: '申請する' }))
    expect(screen.getByText(/サービス申請/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '申請送信' })).toBeInTheDocument()
  })

  it('モーダルで「キャンセル」をクリックするとモーダルが閉じること', () => {
    mockUseServiceCatalog.mockReturnValue({
      data: [MOCK_ITEM],
      isLoading: false,
      isError: false,
    })
    renderWithRouter(<ServiceCatalogPage />)
    fireEvent.click(screen.getByRole('button', { name: '申請する' }))
    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }))
    expect(screen.queryByRole('button', { name: '申請送信' })).not.toBeInTheDocument()
  })

  it('カテゴリラベルが表示されること', () => {
    mockUseServiceCatalog.mockReturnValue({
      data: [MOCK_ITEM],
      isLoading: false,
      isError: false,
    })
    renderWithRouter(<ServiceCatalogPage />)
    expect(screen.getByText('IT機器')).toBeInTheDocument()
  })

  it('複数のカタログアイテムが全て表示されること', () => {
    const items = [
      { ...MOCK_ITEM, id: 'item-1', name: 'ノートPC申請' },
      { ...MOCK_ITEM, id: 'item-2', name: 'ソフトウェアライセンス申請', category: 'software_access' as const },
    ]
    mockUseServiceCatalog.mockReturnValue({
      data: items,
      isLoading: false,
      isError: false,
    })
    renderWithRouter(<ServiceCatalogPage />)
    expect(screen.getByText('ノートPC申請')).toBeInTheDocument()
    expect(screen.getByText('ソフトウェアライセンス申請')).toBeInTheDocument()
  })
})
