import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  useIncident,
  useSLAStatus,
  useAllowedTransitions,
  useTransitionIncident,
} from '@/hooks/use-incidents'
import { StatusBadge, PriorityBadge } from '@/components/incidents/status-badge'
import { SLAIndicator } from '@/components/incidents/sla-indicator'
import { STATUS_LABELS, type IncidentStatus } from '@/types/incident'

function StatusHistory({ logs }: { logs: { id: string; from_status: IncidentStatus | null; to_status: IncidentStatus; changed_by_id: string; comment: string | null; created_at: string }[] }) {
  if (logs.length === 0) return null
  return (
    <div className="rounded-lg border bg-card p-4 space-y-2">
      <h2 className="text-sm font-semibold">ステータス履歴</h2>
      <ul className="space-y-2">
        {logs.map((log) => (
          <li key={log.id} className="flex items-start gap-3 text-sm">
            <span className="text-muted-foreground whitespace-nowrap">
              {new Date(log.created_at).toLocaleString('ja-JP')}
            </span>
            <span>
              {log.from_status ? `${STATUS_LABELS[log.from_status]} → ` : ''}
              <StatusBadge status={log.to_status} />
              {log.comment && (
                <span className="ml-2 text-muted-foreground">（{log.comment}）</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function TransitionPanel({
  incidentId,
  allowedTransitions,
}: {
  incidentId: string
  allowedTransitions: IncidentStatus[]
}) {
  const [selectedStatus, setSelectedStatus] = useState<IncidentStatus | ''>('')
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { mutateAsync, isPending } = useTransitionIncident(incidentId)

  const handleTransition = async () => {
    if (!selectedStatus) return
    setError(null)
    try {
      await mutateAsync({ to_status: selectedStatus as IncidentStatus, comment: comment || undefined })
      setComment('')
      setSelectedStatus('')
    } catch {
      setError('ステータス変更に失敗しました')
    }
  }

  if (allowedTransitions.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <p className="text-sm text-muted-foreground">このインシデントは変更できません</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <h2 className="text-sm font-semibold">ステータス変更</h2>
      {error && (
        <div className="rounded bg-red-50 p-2 text-xs text-red-700">{error}</div>
      )}
      <div className="flex gap-2">
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value as IncidentStatus | '')}
          className="rounded border px-2 py-1 text-sm flex-1"
        >
          <option value="">変更先を選択...</option>
          {allowedTransitions.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <button
          onClick={handleTransition}
          disabled={!selectedStatus || isPending}
          className="rounded-md bg-primary px-3 py-1 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? '変更中...' : '変更'}
        </button>
      </div>
      <input
        type="text"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="コメント（任意）"
        className="w-full rounded border px-2 py-1 text-sm"
      />
    </div>
  )
}

export function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: incident, isLoading, isError } = useIncident(id ?? '')
  const { data: sla } = useSLAStatus(id ?? '')
  const { data: transitions = [] } = useAllowedTransitions(id ?? '')

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">読み込み中...</div>
  }

  if (isError || !incident) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">インシデントが見つかりません</p>
        <button
          onClick={() => navigate('/incidents')}
          className="mt-4 text-sm text-primary hover:underline"
        >
          一覧に戻る
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/incidents')}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← 一覧に戻る
        </button>
        <h1 className="text-xl font-bold flex-1">{incident.title}</h1>
      </div>

      {/* Summary card */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          <StatusBadge status={incident.status} />
          <PriorityBadge priority={incident.priority} />
          {sla && <SLAIndicator sla={sla} />}
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">カテゴリ: </span>
            {incident.category ?? '未設定'}
          </div>
          <div>
            <span className="text-muted-foreground">担当者: </span>
            {incident.assignee_id ? incident.assignee_id.slice(0, 8) + '...' : '未割り当て'}
          </div>
          <div>
            <span className="text-muted-foreground">作成日: </span>
            {new Date(incident.created_at).toLocaleString('ja-JP')}
          </div>
          {incident.resolved_at && (
            <div>
              <span className="text-muted-foreground">解決日: </span>
              {new Date(incident.resolved_at).toLocaleString('ja-JP')}
            </div>
          )}
        </div>

        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">説明</p>
          <p className="text-sm whitespace-pre-wrap">{incident.description}</p>
        </div>
      </div>

      <TransitionPanel
        incidentId={incident.id}
        allowedTransitions={transitions as IncidentStatus[]}
      />

      <StatusHistory logs={incident.status_logs} />
    </div>
  )
}
