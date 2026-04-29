import { useState } from 'react'
import { useSLAPolicies, useCreateSLAPolicy, useUpdateSLAPolicy, useDeleteSLAPolicy } from '@/hooks/use-incidents'
import { PRIORITY_LABELS, type IncidentPriority, type SLAPolicy, type CreateSLAPolicyRequest } from '@/types/incident'

const ALL_PRIORITIES: IncidentPriority[] = ['p1_critical', 'p2_high', 'p3_medium', 'p4_low']

function minutesToLabel(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}分`
  if (m === 0) return `${h}時間`
  return `${h}時間${m}分`
}

interface PolicyFormProps {
  initial?: Partial<CreateSLAPolicyRequest>
  fixedPriority?: IncidentPriority
  onSubmit: (data: CreateSLAPolicyRequest) => void
  onCancel: () => void
  isPending: boolean
}

function PolicyForm({ initial, fixedPriority, onSubmit, onCancel, isPending }: PolicyFormProps) {
  const [priority, setPriority] = useState<IncidentPriority>(
    fixedPriority ?? initial?.priority ?? 'p3_medium',
  )
  const [responseTime, setResponseTime] = useState(String(initial?.response_time_minutes ?? 15))
  const [resolutionTime, setResolutionTime] = useState(String(initial?.resolution_time_minutes ?? 60))
  const [isActive, setIsActive] = useState(initial?.is_active ?? true)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({
      priority,
      response_time_minutes: Number(responseTime),
      resolution_time_minutes: Number(resolutionTime),
      is_active: isActive,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!fixedPriority && (
        <div>
          <label className="block text-sm font-medium mb-1">優先度</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as IncidentPriority)}
            className="w-full rounded border px-3 py-2 text-sm"
            required
          >
            {ALL_PRIORITIES.map((p) => (
              <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className="block text-sm font-medium mb-1">応答時間（分）</label>
        <input
          type="number"
          min={1}
          value={responseTime}
          onChange={(e) => setResponseTime(e.target.value)}
          className="w-full rounded border px-3 py-2 text-sm"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">解決時間（分）</label>
        <input
          type="number"
          min={1}
          value={resolutionTime}
          onChange={(e) => setResolutionTime(e.target.value)}
          className="w-full rounded border px-3 py-2 text-sm"
          required
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          id="is-active"
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="h-4 w-4"
        />
        <label htmlFor="is-active" className="text-sm font-medium">有効</label>
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded border px-4 py-2 text-sm"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
        >
          {isPending ? '保存中...' : '保存'}
        </button>
      </div>
    </form>
  )
}

interface PolicyRowProps {
  policy: SLAPolicy
  onEdit: (p: SLAPolicy) => void
  onDelete: (p: SLAPolicy) => void
  onToggle: (p: SLAPolicy) => void
  isTogglingId: string | null
}

function PolicyRow({ policy, onEdit, onDelete, onToggle, isTogglingId }: PolicyRowProps) {
  return (
    <tr className="border-b">
      <td className="px-4 py-3 text-sm font-medium">{PRIORITY_LABELS[policy.priority]}</td>
      <td className="px-4 py-3 text-sm">{minutesToLabel(policy.response_time_minutes)}</td>
      <td className="px-4 py-3 text-sm">{minutesToLabel(policy.resolution_time_minutes)}</td>
      <td className="px-4 py-3">
        <button
          onClick={() => onToggle(policy)}
          disabled={isTogglingId === policy.id}
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
            policy.is_active
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          {policy.is_active ? '有効' : '無効'}
        </button>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-2">
          <button
            onClick={() => onEdit(policy)}
            className="rounded border px-3 py-1 text-xs hover:bg-accent"
          >
            編集
          </button>
          <button
            onClick={() => onDelete(policy)}
            className="rounded border border-red-300 px-3 py-1 text-xs text-red-600 hover:bg-red-50"
          >
            削除
          </button>
        </div>
      </td>
    </tr>
  )
}

export function AdminSLAPoliciesPage() {
  const { data: policies, isLoading, isError } = useSLAPolicies()
  const createMutation = useCreateSLAPolicy()
  const updateMutation = useUpdateSLAPolicy()
  const deleteMutation = useDeleteSLAPolicy()

  const [showCreate, setShowCreate] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState<SLAPolicy | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const existingPriorities = new Set(policies?.map((p) => p.priority) ?? [])
  const availablePriorities = ALL_PRIORITIES.filter((p) => !existingPriorities.has(p))

  function handleCreate(data: CreateSLAPolicyRequest) {
    createMutation.mutate(data, { onSuccess: () => setShowCreate(false) })
  }

  function handleUpdate(data: CreateSLAPolicyRequest) {
    if (!editingPolicy) return
    updateMutation.mutate(
      { priority: editingPolicy.priority, data },
      { onSuccess: () => setEditingPolicy(null) },
    )
  }

  function handleDelete(policy: SLAPolicy) {
    if (!confirm(`"${PRIORITY_LABELS[policy.priority]}" のSLAポリシーを削除しますか？`)) return
    deleteMutation.mutate(policy.priority)
  }

  function handleToggle(policy: SLAPolicy) {
    setTogglingId(policy.id)
    updateMutation.mutate(
      { priority: policy.priority, data: { is_active: !policy.is_active } },
      { onSettled: () => setTogglingId(null) },
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">SLAポリシー管理</h1>
        {availablePriorities.length > 0 && !showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground"
          >
            + 新規作成
          </button>
        )}
      </div>

      {showCreate && (
        <div className="rounded-lg border bg-card p-4">
          <h2 className="text-sm font-semibold mb-3">新規SLAポリシー</h2>
          <PolicyForm
            onSubmit={handleCreate}
            onCancel={() => setShowCreate(false)}
            isPending={createMutation.isPending}
          />
        </div>
      )}

      {isLoading && <p className="text-muted-foreground text-sm">読み込み中...</p>}
      {isError && <p className="text-red-600 text-sm">データの取得に失敗しました。</p>}

      {policies && (
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-left">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">優先度</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">応答時間</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">解決時間</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">状態</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {policies.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    SLAポリシーが登録されていません
                  </td>
                </tr>
              )}
              {policies.map((policy) => (
                <PolicyRow
                  key={policy.id}
                  policy={policy}
                  onEdit={setEditingPolicy}
                  onDelete={handleDelete}
                  onToggle={handleToggle}
                  isTogglingId={togglingId}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editingPolicy && (
        <div className="rounded-lg border bg-card p-4">
          <h2 className="text-sm font-semibold mb-3">
            編集: {PRIORITY_LABELS[editingPolicy.priority]}
          </h2>
          <PolicyForm
            initial={{
              priority: editingPolicy.priority,
              response_time_minutes: editingPolicy.response_time_minutes,
              resolution_time_minutes: editingPolicy.resolution_time_minutes,
              is_active: editingPolicy.is_active,
            }}
            fixedPriority={editingPolicy.priority}
            onSubmit={handleUpdate}
            onCancel={() => setEditingPolicy(null)}
            isPending={updateMutation.isPending}
          />
        </div>
      )}
    </div>
  )
}
