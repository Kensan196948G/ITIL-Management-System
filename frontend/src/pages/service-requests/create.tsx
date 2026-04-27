import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateServiceRequest } from '@/hooks/use-service-requests'
import type { ServiceRequestCategory } from '@/types/service-request'
import { CATEGORY_LABELS } from '@/types/service-request'

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS) as [ServiceRequestCategory, string][]

export function CreateServiceRequestPage() {
  const navigate = useNavigate()
  const { mutateAsync, isPending } = useCreateServiceRequest()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<ServiceRequestCategory>('other')
  const [dueDate, setDueDate] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const sr = await mutateAsync({
        title,
        description,
        category,
        due_date: dueDate || null,
      })
      navigate(`/service-requests/${sr.id}`)
    } catch {
      setError('サービスリクエストの作成に失敗しました')
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
        <h1 className="text-2xl font-bold">新規サービスリクエスト</h1>
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
            placeholder="リクエストの概要を入力してください"
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
          <label className="block text-sm font-medium mb-1">
            カテゴリ <span className="text-red-500">*</span>
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ServiceRequestCategory)}
            className="rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {CATEGORY_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">希望期限</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? '送信中...' : '送信する'}
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
