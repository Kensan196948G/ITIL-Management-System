import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  useServiceRequest,
  useAllowedServiceRequestTransitions,
  useApproveServiceRequest,
  useRejectServiceRequest,
  useTransitionServiceRequest,
  useUpdateFulfillmentTask,
} from '@/hooks/use-service-requests'
import {
  STATUS_LABELS,
  STATUS_COLORS,
  CATEGORY_LABELS,
  type FulfillmentTask,
  type FulfillmentTaskStatus,
  type ServiceRequestStatus,
} from '@/types/service-request'

const TASK_STATUS_LABELS: Record<FulfillmentTaskStatus, string> = {
  pending: '未着手',
  in_progress: '対応中',
  completed: '完了',
  skipped: 'スキップ',
}

const TASK_STATUS_COLORS: Record<FulfillmentTaskStatus, string> = {
  pending: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  skipped: 'bg-yellow-100 text-yellow-700',
}

function FulfillmentTaskRow({
  task,
  serviceRequestId,
}: {
  task: FulfillmentTask
  serviceRequestId: string
}) {
  const { mutate, isPending } = useUpdateFulfillmentTask(serviceRequestId, task.id)

  const cycleStatus = () => {
    const next: Record<FulfillmentTaskStatus, FulfillmentTaskStatus> = {
      pending: 'in_progress',
      in_progress: 'completed',
      completed: 'pending',
      skipped: 'pending',
    }
    mutate({ status: next[task.status] })
  }

  return (
    <li className="flex items-center gap-3 text-sm py-1.5 border-b last:border-b-0">
      <span className="text-muted-foreground w-5 text-right shrink-0">{task.order + 1}.</span>
      <button
        onClick={cycleStatus}
        disabled={isPending}
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium shrink-0 cursor-pointer hover:opacity-80 ${TASK_STATUS_COLORS[task.status]}`}
        title="クリックでステータスを変更"
      >
        {TASK_STATUS_LABELS[task.status]}
      </button>
      <span className={`flex-1 ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
        {task.title}
      </span>
      {task.due_date && (
        <span className="text-xs text-muted-foreground shrink-0">
          期限: {new Date(task.due_date).toLocaleDateString('ja-JP')}
        </span>
      )}
    </li>
  )
}

function ApprovePanel({ id }: { id: string }) {
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { mutateAsync, isPending } = useApproveServiceRequest(id)

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
        placeholder="コメント（任意）"
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
  const { mutateAsync, isPending } = useRejectServiceRequest(id)

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
  allowedTransitions: ServiceRequestStatus[]
}) {
  const [selectedStatus, setSelectedStatus] = useState<ServiceRequestStatus | ''>('')
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { mutateAsync, isPending } = useTransitionServiceRequest(id)

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
          onChange={(e) => setSelectedStatus(e.target.value as ServiceRequestStatus | '')}
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

export function ServiceRequestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: sr, isLoading, isError } = useServiceRequest(id ?? '')
  const { data: transitions = [] } = useAllowedServiceRequestTransitions(id ?? '')

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">読み込み中...</div>
  }

  if (isError || !sr) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">サービスリクエストが見つかりません</p>
        <button
          onClick={() => navigate('/service-requests')}
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
          onClick={() => navigate('/service-requests')}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← 一覧に戻る
        </button>
        <h1 className="text-xl font-bold flex-1">{sr.title}</h1>
      </div>

      {/* Summary */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[sr.status]}`}
          >
            {STATUS_LABELS[sr.status]}
          </span>
          <span className="text-sm text-muted-foreground">
            {CATEGORY_LABELS[sr.category]}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">申請者: </span>
            {sr.requester_id.slice(0, 8)}...
          </div>
          <div>
            <span className="text-muted-foreground">担当者: </span>
            {sr.assignee_id ? sr.assignee_id.slice(0, 8) + '...' : '未割り当て'}
          </div>
          <div>
            <span className="text-muted-foreground">作成日: </span>
            {new Date(sr.created_at).toLocaleString('ja-JP')}
          </div>
          {sr.due_date && (
            <div>
              <span className="text-muted-foreground">希望期限: </span>
              {new Date(sr.due_date).toLocaleDateString('ja-JP')}
            </div>
          )}
          {sr.approved_at && (
            <div>
              <span className="text-muted-foreground">承認日: </span>
              {new Date(sr.approved_at).toLocaleString('ja-JP')}
            </div>
          )}
          {sr.completed_at && (
            <div>
              <span className="text-muted-foreground">完了日: </span>
              {new Date(sr.completed_at).toLocaleString('ja-JP')}
            </div>
          )}
        </div>

        {sr.rejection_reason && (
          <div className="rounded bg-red-50 p-2 text-sm text-red-700">
            <span className="font-medium">却下理由: </span>
            {sr.rejection_reason}
          </div>
        )}

        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">説明</p>
          <p className="text-sm whitespace-pre-wrap">{sr.description}</p>
        </div>
      </div>

      {/* Actions */}
      {(canApprove || canReject || transitions.length > 0) && (
        <div className="rounded-lg border bg-card p-4 space-y-4">
          <h2 className="text-sm font-semibold">アクション</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {canApprove && <ApprovePanel id={sr.id} />}
            {canReject && <RejectPanel id={sr.id} />}
          </div>
          <TransitionPanel id={sr.id} allowedTransitions={transitions} />
        </div>
      )}

      {/* Fulfillment Tasks */}
      {sr.fulfillment_tasks && sr.fulfillment_tasks.length > 0 && (
        <div className="rounded-lg border bg-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">フルフィルメントタスク</h2>
            <span className="text-xs text-muted-foreground">
              {sr.fulfillment_tasks.filter((t) => t.status === 'completed').length} /{' '}
              {sr.fulfillment_tasks.length} 完了
            </span>
          </div>
          <ul>
            {sr.fulfillment_tasks
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((task) => (
                <FulfillmentTaskRow key={task.id} task={task} serviceRequestId={sr.id} />
              ))}
          </ul>
        </div>
      )}

      {/* Status history */}
      {sr.status_logs.length > 0 && (
        <div className="rounded-lg border bg-card p-4 space-y-2">
          <h2 className="text-sm font-semibold">ステータス履歴</h2>
          <ul className="space-y-2">
            {sr.status_logs.map((log) => (
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
