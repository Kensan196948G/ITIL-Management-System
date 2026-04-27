import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AppLayout } from '@/components/layout/app-layout'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'

// ---- Mock auth store ----
const defaultUser = {
  id: '1',
  email: 'test@example.com',
  full_name: 'テストユーザー',
  role: 'user',
}

const mockAuthStore = {
  isAuthenticated: true,
  user: { ...defaultUser },
  clearAuth: vi.fn(),
}

vi.mock('@/store/auth-store', () => ({
  useAuthStore: () => mockAuthStore,
}))

// ---- Helper ----
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

// ---- AppLayout tests ----
describe('AppLayout', () => {
  beforeEach(() => {
    mockAuthStore.isAuthenticated = true
    mockAuthStore.user = { ...defaultUser }
  })

  afterEach(() => {
    // Reset to authenticated state after each test to avoid cross-file contamination
    mockAuthStore.isAuthenticated = true
    mockAuthStore.user = { ...defaultUser }
    vi.clearAllMocks()
  })

  it('AppLayoutが正しくレンダリングされること', () => {
    renderWithRouter(
      <AppLayout>
        <div>メインコンテンツ</div>
      </AppLayout>
    )

    expect(screen.getByText('メインコンテンツ')).toBeInTheDocument()
  })

  it('AppLayoutがSidebarとHeaderを含むこと', () => {
    renderWithRouter(
      <AppLayout>
        <div>コンテンツ</div>
      </AppLayout>
    )

    // Header displays app name
    expect(screen.getByText('ITIL Management System')).toBeInTheDocument()
    // Sidebar displays nav label
    expect(screen.getByText('ダッシュボード')).toBeInTheDocument()
  })
})

// ---- Sidebar tests ----
describe('Sidebar', () => {
  beforeEach(() => {
    mockAuthStore.isAuthenticated = true
    mockAuthStore.user = { ...defaultUser }
  })
  it('Sidebarにナビゲーションリンクが含まれること', () => {
    renderWithRouter(<Sidebar />)

    expect(screen.getByText('ダッシュボード')).toBeInTheDocument()
    expect(screen.getByText('インシデント管理')).toBeInTheDocument()
    expect(screen.getByText('サービスリクエスト')).toBeInTheDocument()
    expect(screen.getByText('サービスカタログ')).toBeInTheDocument()
    expect(screen.getByText('変更管理')).toBeInTheDocument()
    expect(screen.getByText('承認キュー')).toBeInTheDocument()
  })

  it('各ナビゲーションがリンクであること', () => {
    renderWithRouter(<Sidebar />)

    const incidentLink = screen.getByRole('link', { name: /インシデント管理/ })
    expect(incidentLink).toBeInTheDocument()
    expect(incidentLink).toHaveAttribute('href', '/incidents')
  })

  it('現在のパスがアクティブになること', () => {
    renderWithRouter(<Sidebar />, { initialEntries: ['/incidents'] })

    const incidentLink = screen.getByRole('link', { name: /インシデント管理/ })
    // Active link should have primary styling classes
    expect(incidentLink.className).toContain('bg-primary')
  })
})

// ---- Header tests ----
describe('Header', () => {
  beforeEach(() => {
    mockAuthStore.isAuthenticated = true
    mockAuthStore.user = { ...defaultUser }
  })

  it('HeaderにアプリロゴとユーザーAAが表示されること', () => {
    renderWithRouter(<Header />)

    // App name in header
    expect(screen.getByText('ITIL Management System')).toBeInTheDocument()
    // User full name displayed
    expect(screen.getByText('テストユーザー')).toBeInTheDocument()
  })

  it('Headerにユーザー名が表示されること', () => {
    renderWithRouter(<Header />)

    expect(screen.getByText('テストユーザー')).toBeInTheDocument()
  })

  it('userがnullの場合はデフォルトのユーザー表示をすること', () => {
    mockAuthStore.user = null as unknown as typeof mockAuthStore.user
    renderWithRouter(<Header />)

    expect(screen.getByText('ユーザー')).toBeInTheDocument()
  })
})

// ---- Breadcrumbs tests ----
describe('Breadcrumbs', () => {
  beforeEach(() => {
    mockAuthStore.isAuthenticated = true
    mockAuthStore.user = { ...defaultUser }
  })
  it('ルートではBreadcrumbsを表示しないこと', () => {
    const { container } = renderWithRouter(<Breadcrumbs />, { initialEntries: ['/'] })

    // nav element should not be rendered on root
    const nav = container.querySelector('nav[aria-label="パンくずリスト"]')
    expect(nav).not.toBeInTheDocument()
  })

  it('BreadcrumbsがHomeリンクを含むこと', () => {
    renderWithRouter(<Breadcrumbs />, { initialEntries: ['/incidents'] })

    expect(screen.getByText('ホーム')).toBeInTheDocument()
  })

  it('インシデント管理パスでパンくずが生成されること', () => {
    renderWithRouter(<Breadcrumbs />, { initialEntries: ['/incidents'] })

    expect(screen.getByText('ホーム')).toBeInTheDocument()
    expect(screen.getByText('インシデント管理')).toBeInTheDocument()
  })

  it('最後のBreadcrumbがリンクでないこと', () => {
    renderWithRouter(<Breadcrumbs />, { initialEntries: ['/incidents'] })

    // "インシデント管理" should be a span (not a link) as the last breadcrumb
    const lastCrumb = screen.getByText('インシデント管理')
    expect(lastCrumb.tagName.toLowerCase()).toBe('span')
  })

  it('ネストしたパスでBreadcrumbsが生成されること', () => {
    renderWithRouter(<Breadcrumbs />, { initialEntries: ['/change-requests/123'] })

    expect(screen.getByText('ホーム')).toBeInTheDocument()
    expect(screen.getByText('変更管理')).toBeInTheDocument()
    // ID segment displayed with # prefix
    expect(screen.getByText('#123')).toBeInTheDocument()
  })
})

// ---- Router integration test ----
describe('Layout with Routes', () => {
  beforeEach(() => {
    mockAuthStore.isAuthenticated = true
    mockAuthStore.user = { ...defaultUser }
  })
  it('認証済みユーザーがLayoutRoutesにアクセスできること', () => {
    renderWithRouter(
      <Routes>
        <Route
          path="/*"
          element={
            <AppLayout>
              <Routes>
                <Route path="/" element={<div>ダッシュボードコンテンツ</div>} />
              </Routes>
            </AppLayout>
          }
        />
      </Routes>,
      { initialEntries: ['/'] }
    )

    expect(screen.getByText('ダッシュボードコンテンツ')).toBeInTheDocument()
    expect(screen.getByText('ITIL Management System')).toBeInTheDocument()
  })
})
