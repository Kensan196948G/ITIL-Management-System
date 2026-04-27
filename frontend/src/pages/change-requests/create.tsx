import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateChangeRequest } from '@/hooks/use-change-requests'
import type { ChangeRequestPriority, ChangeRequestRisk, ChangeRequestType } from '@/types/change-request'
import { PRIORITY_LABELS, RISK_LABELS, TYPE_LABELS } from '@/types/change-request'

const TYPE_OPTIONS = Object.entries(TYPE_LABELS) as [ChangeRequestType, string][]
const RISK_OPTIONS = Object.entries(RISK_LABELS) as [ChangeRequestRisk, string][]
const PRIORITY_OPTIONS = Object.entries(PRIORITY_LABELS) as [ChangeRequestPriority, string][]

export function CreateChangeRequestPage() {
  const navigate = useNavigate()
  const { mutateAsync, isPending } = useCreateChangeRequest()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [changeType, setChangeType] = useState<ChangeRequestType>('normal')
  const [riskLevel, setRiskLevel] = useState<ChangeRequestRisk>('medium')
  const [priority, setPriority] = useState<ChangeRequestPriority>('medium')
  const [plannedStart, setPlannedStart] = useState('')
  const [plannedEnd, setPlannedEnd] = useState('')
  const [rollbackPlan, setRollbackPlan] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const cr = await mutateAsync({
        title,
        description,
        change_type: changeType,
        risk_level: riskLevel,
        priority,
        planned_start_at: plannedStart ? new Date(plannedStart).toISOString() : null,
        planned_end_at: plannedEnd ? new Date(plannedEnd).toISOString() : null,
        rollback_plan: rollbackPlan || null,
      })
      navigate(`/change-requests/${cr.id}`)
    } catch {
      setError('変更申請の作成に失敗しました')
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← 戻る
        </button>
        <h1 className="text-2xl font-bold">新規変更申請</h1>
      </div>

      <form onSubmit={handleSubmit} className="rounded-lg border bg-card p-6 space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">
            タイトル <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={500}
            className="w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="変更内容の概要を入力してください"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            説明 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={4}
            className="w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="変更の目的・内容・影響範囲を入力してください"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              変更タイプ <span className="text-red-500">*</span>
            </label>
            <select
              value={changeType}
              onChange={(e) => setChangeType(e.target.value as ChangeRequestType)}
              className="w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {TYPE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              リスクレベル <span className="text-red-500">*</span>
            </label>
            <select
              value={riskLevel}
              onChange={(e) => setRiskLevel(e.target.value as ChangeRequestRisk)}
              className="w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {RISK_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              優先度 <span className="text-red-500">*</span>
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as ChangeRequestPriority)}
              className="w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {PRIORITY_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">実施予定開始日時</label>
            <input
              type="datetime-local"
              value={plannedStart}
              onChange={(e) => setPlannedStart(e.target.value)}
              className="w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">実施予定終了日時</label>
            <input
              type="datetime-local"
              value={plannedEnd}
              onChange={(e) => setPlannedEnd(e.target.value)}
              className="w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">ロールバック計画</label>
          <textarea
            value={rollbackPlan}
            onChange={(e) => setRollbackPlan(e.target.value)}
            rows={3}
            className="w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="問題発生時のロールバック手順を記載してください"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? '作成中...' : '下書きとして作成'}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            キャンセル
          </button>
        </div>
      </form>
    </div>
  )
}
