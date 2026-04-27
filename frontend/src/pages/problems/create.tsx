import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateProblem } from '@/hooks/use-problems'
import type { ProblemPriority } from '@/types/problem'

export function CreateProblemPage() {
  const navigate = useNavigate()
  const { mutateAsync, isPending } = useCreateProblem()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<ProblemPriority>('p3_medium')
  const [rootCause, setRootCause] = useState('')
  const [workaround, setWorkaround] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const problem = await mutateAsync({
        title,
        description,
        priority,
        root_cause: rootCause || undefined,
        workaround: workaround || undefined,
      })
      navigate(`/problems/${problem.id}`)
    } catch {
      setError('問題の作成に失敗しました')
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/problems')}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← 一覧に戻る
        </button>
        <h1 className="text-xl font-bold">問題の新規作成</h1>
      </div>

      <form onSubmit={handleSubmit} className="rounded-lg border bg-card p-6 space-y-4">
        {error && (
          <div className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">
            タイトル <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm"
            placeholder="問題のタイトルを入力"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            説明 <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm resize-none"
            placeholder="問題の詳細を入力"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">優先度</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as ProblemPriority)}
            className="rounded border px-3 py-2 text-sm"
          >
            <option value="p1_critical">P1 緊急</option>
            <option value="p2_high">P2 高</option>
            <option value="p3_medium">P3 中</option>
            <option value="p4_low">P4 低</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">根本原因（任意）</label>
          <textarea
            rows={3}
            value={rootCause}
            onChange={(e) => setRootCause(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm resize-none"
            placeholder="判明している根本原因があれば入力"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">回避策（任意）</label>
          <textarea
            rows={3}
            value={workaround}
            onChange={(e) => setWorkaround(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm resize-none"
            placeholder="暫定的な回避策があれば入力"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/problems')}
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? '作成中...' : '作成'}
          </button>
        </div>
      </form>
    </div>
  )
}
