import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NotificationsPage } from '@/pages/notifications'
import type { Notification } from '@/types/notification'

const mockMarkRead = vi.fn()
const mockMarkAllRead = vi.fn()
const mockDelete = vi.fn()

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-1',
    user_id: 'user-1',
    title: '未読通知タイトル',
    message: '未読メッセージ内容',
    category: 'incident',
    priority: 'high',
    is_read: false,
    related_id: 'inc-1',
    related_url: '/incidents/inc-1',
    created_at: '2024-01-15T10:00:00Z',
  },
  {
    id: 'notif-2',
    user_id: 'user-1',
    title: '既読通知タイトル',
    message: '既読メッセージ内容',
    category: 'system',
    priority: 'low',
    is_read: true,
    related_id: null,
    related_url: null,
    created_at: '2024-01-14T08:00:00Z',
  },
]

vi.mock('@/hooks/use-notifications', () => ({
  useNotifications: vi.fn(() => ({
    data: { items: MOCK_NOTIFICATIONS, total: 2, unread_count: 1 },
    isLoading: false,
    isError: false,
  })),
  useMarkNotificationsRead: () => ({ mutate: mockMarkRead, isPending: false }),
  useMarkAllNotificationsRead: () => ({ mutate: mockMarkAllRead, isPending: false }),
  useDeleteNotification: () => ({ mutate: mockDelete, isPending: false }),
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <NotificationsPage />
    </MemoryRouter>
  )
}

describe('NotificationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('ページタイトルと通知件数バッジが表示されること', () => {
    renderPage()

    expect(screen.getByText('通知')).toBeInTheDocument()
    // unread_count badge
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('通知一覧が表示されること', () => {
    renderPage()

    expect(screen.getByText('未読通知タイトル')).toBeInTheDocument()
    expect(screen.getByText('未読メッセージ内容')).toBeInTheDocument()
    expect(screen.getByText('既読通知タイトル')).toBeInTheDocument()
    expect(screen.getByText('既読メッセージ内容')).toBeInTheDocument()
  })

  it('カテゴリラベルが表示されること', () => {
    renderPage()

    expect(screen.getByText('インシデント')).toBeInTheDocument()
    expect(screen.getByText('システム')).toBeInTheDocument()
  })

  it('「詳細を見る」リンクが表示されること', () => {
    renderPage()

    const detailLink = screen.getByText('詳細を見る →')
    expect(detailLink).toBeInTheDocument()
    expect(detailLink).toHaveAttribute('href', '/incidents/inc-1')
  })

  it('「すべて既読にする」ボタンが表示されること', () => {
    renderPage()

    expect(screen.getByText('すべて既読にする')).toBeInTheDocument()
  })

  it('「すべて既読にする」ボタン押下でmarkAllReadが呼ばれること', () => {
    renderPage()

    fireEvent.click(screen.getByText('すべて既読にする'))
    expect(mockMarkAllRead).toHaveBeenCalled()
  })

  it('未読通知の既読ボタンが表示されること', () => {
    renderPage()

    const readButtons = screen.getAllByTitle('既読にする')
    expect(readButtons.length).toBeGreaterThanOrEqual(1)
  })

  it('削除ボタンが各通知に表示されること', () => {
    renderPage()

    const deleteButtons = screen.getAllByTitle('削除')
    expect(deleteButtons).toHaveLength(2)
  })

  it('削除ボタン押下でdeleteが呼ばれること', () => {
    renderPage()

    const deleteButtons = screen.getAllByTitle('削除')
    fireEvent.click(deleteButtons[0])
    expect(mockDelete).toHaveBeenCalledWith('notif-1')
  })

  it('フィルタータブが表示されること', () => {
    renderPage()

    expect(screen.getByText('すべて')).toBeInTheDocument()
    expect(screen.getByText('未読のみ')).toBeInTheDocument()
  })

  it('通知が空のとき「通知はありません」が表示されること', async () => {
    const { useNotifications } = await import('@/hooks/use-notifications')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useNotifications).mockReturnValueOnce({ data: { items: [], total: 0, unread_count: 0 } } as any)

    renderPage()

    expect(screen.getByText('通知はありません')).toBeInTheDocument()
  })

  it('ローディング中は読み込みメッセージが表示されること', async () => {
    const { useNotifications } = await import('@/hooks/use-notifications')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useNotifications).mockReturnValueOnce({ data: undefined, isLoading: true, isError: false } as any)

    renderPage()

    expect(screen.getByText('読み込み中...')).toBeInTheDocument()
  })

  it('エラー時はエラーメッセージが表示されること', async () => {
    const { useNotifications } = await import('@/hooks/use-notifications')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useNotifications).mockReturnValueOnce({ data: undefined, isLoading: false, isError: true } as any)

    renderPage()

    expect(screen.getByText('通知の取得に失敗しました。')).toBeInTheDocument()
  })
})
