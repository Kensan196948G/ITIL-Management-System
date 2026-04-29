import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useServiceRequests } from '@/hooks/use-service-requests'
import { useChangeRequests } from '@/hooks/use-change-requests'
import {
  STATUS_COLORS as SR_STATUS_COLORS,
  STATUS_LABELS as SR_STATUS_LABELS,
} from '@/types/service-request'
import {
  PRIORITY_LABELS as CR_PRIORITY_LABELS,
  STATUS_COLORS as CR_STATUS_COLORS,
  STATUS_LABELS as CR_STATUS_LABELS,
} from '@/types/change-request'

type TabType = 'all' | 'sr' | 'cr'

function Badge({ label, colorClass }: { label: string; colorClass: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}>
      {label}
    </span>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground text-sm">
      {message}
    </div>
  )
}

export function ApprovalsPage() {
  const [tab, setTab] = useState<TabType>('all')

  const srQuery = useServiceRequests({ status: 'pending_approval', page_size: 50 })
  const crQuery = useChangeRequests({ status: 'submitted', page_size: 50 })
  const crUnderReview = useChangeRequests({ status: 'under_review', page_size: 50 })

  const srItems = srQuery.data?.items ?? []
  const crSubmitted = crQuery.data?.items ?? []
  const crReview = crUnderReview.data?.items ?? []
  const crItems = [...crSubmitted, ...crReview]

  const isLoading = srQuery.isLoading || crQuery.isLoading || crUnderReview.isLoading
  const isError = srQuery.isError || crQuery.isError || crUnderReview.isError

  const srCount = srItems.length
  const crCount = crItems.length
  const allCount = srCount + crCount

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: 'all', label: '全て', count: allCount },
    { key: 'sr', label: 'サービスリクエスト', count: srCount },
    { key: 'cr', label: '変更管理', count: crCount },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">承認キュー</h1>
        <p className="text-sm text-muted-foreground mt-1">承認待ちのリクエストを一覧表示します</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1 text-xs text-primary">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="p-8 text-center text-muted-foreground text-sm">読み込み中...</div>
      )}

      {isError && (
        <div className="p-8 text-center text-red-600 text-sm">データの取得に失敗しました</div>
      )}

      {!isLoading && !isError && (
        <div className="space-y-3">
          {/* Service Requests */}
          {(tab === 'all' || tab === 'sr') && (
            <>
              {tab === 'all' && srCount > 0 && (
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  サービスリクエスト ({srCount})
                </h2>
              )}
              {srCount === 0 && tab === 'sr' ? (
                <EmptyState message="承認待ちのサービスリクエストはありません" />
              ) : (
                <div className="space-y-2">
                  {srItems.map((sr) => (
                    <Link
                      key={`sr-${sr.id}`}
                      to={`/service-requests/${sr.id}`}
                      className="block rounded-lg border bg-card p-4 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-muted-foreground">SR</span>
                            <p className="text-sm font-medium truncate">{sr.title}</p>
                          </div>
                          {sr.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {sr.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {new Date(sr.created_at).toLocaleString('ja-JP')}
                          </p>
                        </div>
                        <div className="shrink-0">
                          <Badge
                            label={SR_STATUS_LABELS[sr.status]}
                            colorClass={SR_STATUS_COLORS[sr.status]}
                          />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Change Requests */}
          {(tab === 'all' || tab === 'cr') && (
            <>
              {tab === 'all' && crCount > 0 && (
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mt-4">
                  変更管理 ({crCount})
                </h2>
              )}
              {crCount === 0 && tab === 'cr' ? (
                <EmptyState message="承認待ちの変更リクエストはありません" />
              ) : (
                <div className="space-y-2">
                  {crItems.map((cr) => (
                    <Link
                      key={`cr-${cr.id}`}
                      to={`/change-requests/${cr.id}`}
                      className="block rounded-lg border bg-card p-4 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-muted-foreground">CR</span>
                            <p className="text-sm font-medium truncate">{cr.title}</p>
                          </div>
                          {cr.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {cr.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-muted-foreground">
                              {new Date(cr.created_at).toLocaleString('ja-JP')}
                            </p>
                            {cr.priority && (
                              <span className="text-xs text-muted-foreground">
                                · {CR_PRIORITY_LABELS[cr.priority]}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0">
                          <Badge
                            label={CR_STATUS_LABELS[cr.status]}
                            colorClass={CR_STATUS_COLORS[cr.status]}
                          />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Empty state for "all" tab */}
          {tab === 'all' && allCount === 0 && (
            <EmptyState message="承認待ちのリクエストはありません" />
          )}
        </div>
      )}
    </div>
  )
}
