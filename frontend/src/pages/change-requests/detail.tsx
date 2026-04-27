import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  useChangeRequest,
  useAllowedChangeRequestTransitions,
  useApproveChangeRequest,
  useRejectChangeRequest,
  useTransitionChangeRequest,
} from '@/hooks/use-change-requests'
import {
  PRIORITY_LABELS,
  RISK_COLORS,
  RISK_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  TYPE_COLORS,
  TYPE_LABELS,
  type ChangeRequestStatus,
} from '@/types/change-request'

function ApprovePanel({ id }: { id: string }) {
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { mutateAsync, isPending } = useApproveChangeRequest(id)

  const handleApprove = async () => {
    setError(null)
    try {
      await mutateAsync({ comment: comment || null })
      setComment('')
    } catch {
      setError('承認処理に失敗しました')
    }
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-green-700">承認</h3>
      {error && <div className="rounded bg-red-50 p-2 text-xs text-red-700">{error}</div>}
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="承認コメント（任意）"
        rows={2}
        className="w-full rounded border px-2 py-1 text-sm"
      />
      <button
        onClick={handleApprove}
        disabled={isPending}
        className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
      >
        {isPending ? '処理中...' : '承認する'}
      </button>
    </div>
  )
}

function RejectPanel({ id }: { id: string }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { mutateAsync, isPending } = useRejectChangeRequest(id)

  const handleReject = async () => {
    if (!reason.trim()) {
      setError('却下理由を入力してください')
      return
    }
    setError(null)
    try {
      await mutateAsync({ rejection_reason: reason })
      setReason('')
    } catch {
      setError('却下処理に失敗しました')
    }
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-red-700">却下</h3>
      {error && <div className="rounded bg-red-50 p-2 text-xs text-red-700">{error}</div>}
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="却下理由を入力してください（必須）"
        rows={2}
        className="w-full rounded border px-2 py-1 text-sm"
        required
      />
      <button
        onClick={handleReject}
        disabled={isPending}
        className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
      >
        {isPending ? '処理中...' : '却下する'}
      </button>
    </div>
  )
}

function TransitionPanel({
  id,
  allowedTransitions,
}: {
  id: string
  allowedTransitions: ChangeRequestStatus[]
}) {
  const [selectedStatus, setSelectedStatus] = useState<ChangeRequestStatus | ''>('')
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { mutateAsync, isPending } = useTransitionChangeRequest(id)

  const nonApprovalTransitions = allowedTransitions.filter(
    (s) => s !== 'approved' && s !== 'rejected',
  )

  const handleTransition = async () => {
    if (!selectedStatus) return
    setError(null)
    try {
      await mutateAsync({ to_status: selectedStatus, comment: comment || null })
      setComment('')
      setSelectedStatus('')
    } catch {
      setError('ステータス変更に失敗しました')
    }
  }

  if (nonApprovalTransitions.length === 0) return null

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">ステータス変更</h3>
      {error && <div className="rounded bg-red-50 p-2 text-xs text-red-700">{error}</div>}
      <div className="flex gap-2">
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value as ChangeRequestStatus | '')}
          className="rounded border px-2 py-1 text-sm flex-1"
        >
          <option value="">変更先を選択...</option>
          {nonApprovalTransitions.map((s) => (
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

export function ChangeRequestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: cr, isLoading, isError } = useChangeRequest(id ?? '')
  const { data: transitions = [] } = useAllowedChangeRequestTransitions(id ?? '')

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">読み込み中...</div>
  }

  if (isError || !cr) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">変更申請が見つかりません</p>
        <button
          onClick={() => navigate('/change-requests')}
          className="mt-4 text-sm text-primary hover:underline"
        >
          一覧に戻る
        </button>
      </div>
    )
  }

  const canApprove = transitions.includes('approved')
  const canReject = transitions.includes('rejected')

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/change-requests')}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← 一覧に戻る
        </button>
        <h1 className="text-xl font-bold flex-1">{cr.title}</h1>
      </div>

      {/* Summary */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[cr.status]}`}
          >
            {STATUS_LABELS[cr.status]}
          </span>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_COLORS[cr.change_type]}`}
          >
            {TYPE_LABELS[cr.change_type]}
          </span>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${RISK_COLORS[cr.risk_level]}`}
          >
            リスク: {RISK_LABELS[cr.risk_level]}
          </span>
          <span className="text-xs text-muted-foreground">
            優先度: {PRIORITY_LABELS[cr.priority]}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">申請者: </span>
            {cr.requester_id.slice(0, 8)}...
          </div>
          {cr.implementer_id && (
            <div>
              <span className="text-muted-foreground">実施者: </span>
              {cr.implementer_id.slice(0, 8)}...
            </div>
          )}
          {cr.approver_id && (
            <div>
              <span className="text-muted-foreground">承認者: </span>
              {cr.approver_id.slice(0, 8)}...
            </div>
          )}
          {cr.reviewer_id && (
            <div>
              <span className="text-muted-foreground">レビュアー: </span>
              {cr.reviewer_id.slice(0, 8)}...
            </div>
          )}
          <div>
            <span className="text-muted-foreground">作成日: </span>
            {new Date(cr.created_at).toLocaleString('ja-JP')}
          </div>
          {cr.planned_start_at && (
            <div>
              <span className="text-muted-foreground">実施予定開始: </span>
              {new Date(cr.planned_start_at).toLocaleString('ja-JP')}
            </div>
          )}
          {cr.planned_end_at && (
            <div>
              <span className="text-muted-foreground">実施予定終了: </span>
              {new Date(cr.planned_end_at).toLocaleString('ja-JP')}
            </div>
          )}
          {cr.actual_start_at && (
            <div>
              <span className="text-muted-foreground">実施開始: </span>
              {new Date(cr.actual_start_at).toLocaleString('ja-JP')}
            </div>
          )}
          {cr.actual_end_at && (
            <div>
              <span className="text-muted-foreground">実施終了: </span>
              {new Date(cr.actual_end_at).toLocaleString('ja-JP')}
            </div>
          )}
          {cr.approved_at && (
            <div>
              <span className="text-muted-foreground">承認日: </span>
              {new Date(cr.approved_at).toLocaleString('ja-JP')}
            </div>
          )}
        </div>

        {cr.rejection_reason && (
          <div className="rounded bg-red-50 p-2 text-sm text-red-700">
            <span className="font-medium">却下理由: </span>
            {cr.rejection_reason}
          </div>
        )}

        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">説明</p>
          <p className="text-sm whitespace-pre-wrap">{cr.description}</p>
        </div>

        {cr.rollback_plan && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">ロールバック計画</p>
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">{cr.rollback_plan}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      {(canApprove || canReject || transitions.length > 0) && (
        <div className="rounded-lg border bg-card p-4 space-y-4">
          <h2 className="text-sm font-semibold">アクション</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {canApprove && <ApprovePanel id={cr.id} />}
            {canReject && <RejectPanel id={cr.id} />}
          </div>
          <TransitionPanel id={cr.id} allowedTransitions={transitions} />
        </div>
      )}

      {/* Status history */}
      {cr.status_logs.length > 0 && (
        <div className="rounded-lg border bg-card p-4 space-y-2">
          <h2 className="text-sm font-semibold">ステータス履歴</h2>
          <ul className="space-y-2">
            {cr.status_logs.map((log) => (
              <li key={log.id} className="flex items-start gap-3 text-sm">
                <span className="text-muted-foreground whitespace-nowrap">
                  {new Date(log.created_at).toLocaleString('ja-JP')}
                </span>
                <span>
                  {log.from_status ? `${STATUS_LABELS[log.from_status]} → ` : ''}
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[log.to_status]}`}
                  >
                    {STATUS_LABELS[log.to_status]}
                  </span>
                  {log.comment && (
                    <span className="ml-2 text-muted-foreground">（{log.comment}）</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
