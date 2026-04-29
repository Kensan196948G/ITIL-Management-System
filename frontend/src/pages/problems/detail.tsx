import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  useProblem,
  useProblemAllowedTransitions,
  useTransitionProblem,
  useUnlinkIncident,
} from '@/hooks/use-problems'
import { ProblemStatusBadge, ProblemPriorityBadge } from '@/components/problems/status-badge'
import { STATUS_LABELS, type ProblemStatus, type ProblemStatusLog, type LinkedIncident } from '@/types/problem'

function StatusHistory({ logs }: { logs: ProblemStatusLog[] }) {
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
              <ProblemStatusBadge status={log.to_status} />
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
  problemId,
  allowedTransitions,
}: {
  problemId: string
  allowedTransitions: ProblemStatus[]
}) {
  const [selectedStatus, setSelectedStatus] = useState<ProblemStatus | ''>('')
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { mutateAsync, isPending } = useTransitionProblem(problemId)

  const handleTransition = async () => {
    if (!selectedStatus) return
    setError(null)
    try {
      await mutateAsync({ to_status: selectedStatus as ProblemStatus, comment: comment || undefined })
      setComment('')
      setSelectedStatus('')
    } catch {
      setError('ステータス変更に失敗しました')
    }
  }

  if (allowedTransitions.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <p className="text-sm text-muted-foreground">この問題は変更できません</p>
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
          onChange={(e) => setSelectedStatus(e.target.value as ProblemStatus | '')}
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

function LinkedIncidentsList({
  problemId,
  incidents,
}: {
  problemId: string
  incidents: LinkedIncident[]
}) {
  const { mutateAsync: unlink, isPending } = useUnlinkIncident(problemId)
  const [unlinkError, setUnlinkError] = useState<string | null>(null)

  const handleUnlink = async (incidentId: string) => {
    setUnlinkError(null)
    try {
      await unlink(incidentId)
    } catch {
      setUnlinkError('関連付けの解除に失敗しました')
    }
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-2">
      <h2 className="text-sm font-semibold">関連インシデント</h2>
      {unlinkError && (
        <div className="rounded bg-red-50 p-2 text-xs text-red-700">{unlinkError}</div>
      )}
      {incidents.length === 0 ? (
        <p className="text-sm text-muted-foreground">関連インシデントなし</p>
      ) : (
        <ul className="space-y-2">
          {incidents.map((inc) => (
            <li key={inc.id} className="flex items-center justify-between text-sm">
              <span className="font-mono text-xs text-muted-foreground mr-2">
                {inc.id.slice(0, 8)}...
              </span>
              <span className="flex-1">{inc.title}</span>
              <button
                onClick={() => handleUnlink(inc.id)}
                disabled={isPending}
                className="ml-2 text-xs text-red-600 hover:underline disabled:opacity-50"
              >
                解除
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function ProblemDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: problem, isLoading, isError } = useProblem(id ?? '')
  const { data: transitions = [] } = useProblemAllowedTransitions(id ?? '')

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">読み込み中...</div>
  }

  if (isError || !problem) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">問題が見つかりません</p>
        <button
          onClick={() => navigate('/problems')}
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
          onClick={() => navigate('/problems')}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← 一覧に戻る
        </button>
        <h1 className="text-xl font-bold flex-1">{problem.title}</h1>
      </div>

      {/* Summary card */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          <ProblemStatusBadge status={problem.status} />
          <ProblemPriorityBadge priority={problem.priority} />
          {problem.is_known_error && (
            <span className="inline-flex items-center rounded-full bg-orange-100 text-orange-800 px-2.5 py-0.5 text-xs font-medium">
              既知エラー (KEDB)
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">担当者: </span>
            {problem.assignee_id ? problem.assignee_id.slice(0, 8) + '...' : '未割り当て'}
          </div>
          <div>
            <span className="text-muted-foreground">作成日: </span>
            {new Date(problem.created_at).toLocaleString('ja-JP')}
          </div>
          {problem.resolved_at && (
            <div>
              <span className="text-muted-foreground">解決日: </span>
              {new Date(problem.resolved_at).toLocaleString('ja-JP')}
            </div>
          )}
          {problem.closed_at && (
            <div>
              <span className="text-muted-foreground">クローズ日: </span>
              {new Date(problem.closed_at).toLocaleString('ja-JP')}
            </div>
          )}
        </div>

        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">説明</p>
          <p className="text-sm whitespace-pre-wrap">{problem.description}</p>
        </div>

        {problem.root_cause && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">根本原因</p>
            <p className="text-sm whitespace-pre-wrap">{problem.root_cause}</p>
          </div>
        )}

        {problem.workaround && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">回避策</p>
            <p className="text-sm whitespace-pre-wrap">{problem.workaround}</p>
          </div>
        )}
      </div>

      <TransitionPanel
        problemId={problem.id}
        allowedTransitions={transitions as ProblemStatus[]}
      />

      <LinkedIncidentsList
        problemId={problem.id}
        incidents={problem.linked_incidents}
      />

      <StatusHistory logs={problem.status_logs} />
    </div>
  )
}
