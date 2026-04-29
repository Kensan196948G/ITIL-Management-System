import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AdminSLAPoliciesPage } from '@/pages/admin/sla-policies'
import { useSLAPolicies, useCreateSLAPolicy, useUpdateSLAPolicy, useDeleteSLAPolicy } from '@/hooks/use-incidents'

vi.mock('@/hooks/use-incidents', () => ({
  useSLAPolicies: vi.fn(),
  useCreateSLAPolicy: vi.fn(),
  useUpdateSLAPolicy: vi.fn(),
  useDeleteSLAPolicy: vi.fn(),
}))

const mockPolicy = {
  id: 'uuid-1',
  priority: 'p1_critical' as const,
  response_time_minutes: 15,
  resolution_time_minutes: 60,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

function makeDefaultMocks() {
  vi.mocked(useSLAPolicies).mockReturnValue({
    data: [mockPolicy],
    isLoading: false,
    isError: false,
  } as ReturnType<typeof useSLAPolicies>)
  vi.mocked(useCreateSLAPolicy).mockReturnValue({ mutate: vi.fn(), isPending: false } as unknown as ReturnType<typeof useCreateSLAPolicy>)
  vi.mocked(useUpdateSLAPolicy).mockReturnValue({ mutate: vi.fn(), isPending: false } as unknown as ReturnType<typeof useUpdateSLAPolicy>)
  vi.mocked(useDeleteSLAPolicy).mockReturnValue({ mutate: vi.fn(), isPending: false } as unknown as ReturnType<typeof useDeleteSLAPolicy>)
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AdminSLAPoliciesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AdminSLAPoliciesPage', () => {
  beforeEach(() => {
    makeDefaultMocks()
  })

  it('renders page title', () => {
    renderPage()
    expect(screen.getByText('SLAポリシー管理')).toBeInTheDocument()
  })

  it('displays existing policy row', () => {
    renderPage()
    expect(screen.getByText('P1 緊急')).toBeInTheDocument()
    expect(screen.getByText('15分')).toBeInTheDocument()
    expect(screen.getByText('1時間')).toBeInTheDocument()
    expect(screen.getByText('有効')).toBeInTheDocument()
  })

  it('shows create button when there are available priorities', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /新規作成/ })).toBeInTheDocument()
  })

  it('hides create button when all priorities are configured', () => {
    vi.mocked(useSLAPolicies).mockReturnValueOnce({
      data: [
        { ...mockPolicy, priority: 'p1_critical' as const },
        { ...mockPolicy, id: 'uuid-2', priority: 'p2_high' as const },
        { ...mockPolicy, id: 'uuid-3', priority: 'p3_medium' as const },
        { ...mockPolicy, id: 'uuid-4', priority: 'p4_low' as const },
      ],
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useSLAPolicies>)
    renderPage()
    expect(screen.queryByRole('button', { name: /新規作成/ })).not.toBeInTheDocument()
  })

  it('shows create form when new button is clicked', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /新規作成/ }))
    expect(screen.getByText('新規SLAポリシー')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    vi.mocked(useSLAPolicies).mockReturnValueOnce({
      data: undefined,
      isLoading: true,
      isError: false,
    } as unknown as ReturnType<typeof useSLAPolicies>)
    renderPage()
    expect(screen.getByText('読み込み中...')).toBeInTheDocument()
  })

  it('shows error state', () => {
    vi.mocked(useSLAPolicies).mockReturnValueOnce({
      data: undefined,
      isLoading: false,
      isError: true,
    } as unknown as ReturnType<typeof useSLAPolicies>)
    renderPage()
    expect(screen.getByText('データの取得に失敗しました。')).toBeInTheDocument()
  })

  it('shows empty state when no policies', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useSLAPolicies).mockReturnValueOnce({ data: [], isLoading: false, isError: false } as any)
    renderPage()
    expect(screen.getByText('SLAポリシーが登録されていません')).toBeInTheDocument()
  })

  it('shows edit form when edit button is clicked', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: '編集' }))
    expect(screen.getByText(/編集: P1 緊急/)).toBeInTheDocument()
  })

  it('calls update mutation on toggle', () => {
    const mutate = vi.fn()
    vi.mocked(useUpdateSLAPolicy).mockReturnValueOnce({ mutate, isPending: false } as unknown as ReturnType<typeof useUpdateSLAPolicy>)
    renderPage()
    fireEvent.click(screen.getByText('有効'))
    expect(mutate).toHaveBeenCalledWith(
      { priority: 'p1_critical', data: { is_active: false } },
      expect.any(Object),
    )
  })

  it('calls delete mutation after confirmation', async () => {
    const mutate = vi.fn()
    vi.mocked(useDeleteSLAPolicy).mockReturnValueOnce({ mutate, isPending: false } as unknown as ReturnType<typeof useDeleteSLAPolicy>)
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true)
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: '削除' }))
    await waitFor(() => {
      expect(mutate).toHaveBeenCalledWith('p1_critical')
    })
  })

  it('does not delete when confirmation is cancelled', () => {
    const mutate = vi.fn()
    vi.mocked(useDeleteSLAPolicy).mockReturnValueOnce({ mutate, isPending: false } as unknown as ReturnType<typeof useDeleteSLAPolicy>)
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false)
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: '削除' }))
    expect(mutate).not.toHaveBeenCalled()
  })
})
