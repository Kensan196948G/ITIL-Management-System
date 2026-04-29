import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateIncident } from '@/hooks/use-incidents'
import type { IncidentPriority } from '@/types/incident'

export function CreateIncidentPage() {
  const navigate = useNavigate()
  const { mutateAsync, isPending } = useCreateIncident()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<IncidentPriority>('p3_medium')
  const [category, setCategory] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const incident = await mutateAsync({
        title,
        description,
        priority,
        category: category || undefined,
      })
      navigate(`/incidents/${incident.id}`)
    } catch {
      setError('インシデントの作成に失敗しました')
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
        <h1 className="text-2xl font-bold">インシデント登録</h1>
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
            placeholder="インシデントの概要を入力してください"
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
            placeholder="詳細な説明を入力してください"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">優先度</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as IncidentPriority)}
            className="rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="p1_critical">P1 緊急（1時間以内）</option>
            <option value="p2_high">P2 高（4時間以内）</option>
            <option value="p3_medium">P3 中（8時間以内）</option>
            <option value="p4_low">P4 低（2日以内）</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">カテゴリ</label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            maxLength={100}
            className="w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="例: ネットワーク、アプリケーション"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? '登録中...' : '登録する'}
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
