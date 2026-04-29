import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ChangeScheduleCalendarPage } from '@/pages/change-requests/calendar'

const mockUseChangeScheduleCalendar = vi.fn()

vi.mock('@/hooks/use-change-requests', () => ({
  useChangeScheduleCalendar: () => mockUseChangeScheduleCalendar(),
}))

const MOCK_ITEM = {
  change_request_id: 'cr-0001-0002-0003-0004-0005',
  title: 'DBマイグレーション実施',
  scheduled_start: '2026-04-15T20:00:00Z',
  scheduled_end: '2026-04-15T22:00:00Z',
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ChangeScheduleCalendarPage />
    </MemoryRouter>,
  )
}

describe('ChangeScheduleCalendarPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseChangeScheduleCalendar.mockReturnValue({ data: [], isLoading: false, isError: false })
  })

  it('ページタイトル「変更スケジュールカレンダー」が表示されること', () => {
    renderPage()
    expect(screen.getByText('変更スケジュールカレンダー')).toBeInTheDocument()
  })

  it('「← 変更申請一覧」リンクが表示されること', () => {
    renderPage()
    const link = screen.getByRole('link', { name: /変更申請一覧/ })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/change-requests')
  })

  it('月ナビゲーションボタンが表示されること', () => {
    renderPage()
    expect(screen.getByText('← 前月')).toBeInTheDocument()
    expect(screen.getByText('翌月 →')).toBeInTheDocument()
    expect(screen.getByText('今月')).toBeInTheDocument()
  })

  it('ローディング中に「読み込み中...」が表示されること', () => {
    mockUseChangeScheduleCalendar.mockReturnValue({ data: [], isLoading: true, isError: false })
    renderPage()
    expect(screen.getByText('読み込み中...')).toBeInTheDocument()
  })

  it('エラー時に「データの取得に失敗しました」が表示されること', () => {
    mockUseChangeScheduleCalendar.mockReturnValue({ data: [], isLoading: false, isError: true })
    renderPage()
    expect(screen.getByText('データの取得に失敗しました')).toBeInTheDocument()
  })

  it('データが空の場合に「この月に予定されている変更はありません」が表示されること', () => {
    renderPage()
    expect(screen.getByText('この月に予定されている変更はありません')).toBeInTheDocument()
  })

  it('スケジュールアイテムが表示されること', () => {
    mockUseChangeScheduleCalendar.mockReturnValue({ data: [MOCK_ITEM], isLoading: false, isError: false })
    renderPage()
    expect(screen.getByText('DBマイグレーション実施')).toBeInTheDocument()
  })

  it('スケジュールアイテムが変更申請詳細ページへのリンクであること', () => {
    mockUseChangeScheduleCalendar.mockReturnValue({ data: [MOCK_ITEM], isLoading: false, isError: false })
    renderPage()
    const link = screen.getByRole('link', { name: /DBマイグレーション実施/ })
    expect(link).toHaveAttribute('href', `/change-requests/${MOCK_ITEM.change_request_id}`)
  })

  it('前月ボタンをクリックすると月が変わること', () => {
    renderPage()
    const prevButton = screen.getByText('← 前月')
    const currentMonth = screen.getByText(/^\d{4}年\d{1,2}月$/)
    const currentText = currentMonth.textContent
    fireEvent.click(prevButton)
    const updatedMonth = screen.getByText(/^\d{4}年\d{1,2}月$/)
    expect(updatedMonth.textContent).not.toBe(currentText)
  })

  it('翌月ボタンをクリックすると月が変わること', () => {
    renderPage()
    const nextButton = screen.getByText('翌月 →')
    const currentMonth = screen.getByText(/^\d{4}年\d{1,2}月$/)
    const currentText = currentMonth.textContent
    fireEvent.click(nextButton)
    const updatedMonth = screen.getByText(/^\d{4}年\d{1,2}月$/)
    expect(updatedMonth.textContent).not.toBe(currentText)
  })

  it('月ラベルが「YYYY年M月」形式で表示されること', () => {
    renderPage()
    expect(screen.getByText(/^\d{4}年\d{1,2}月$/)).toBeInTheDocument()
  })
})
