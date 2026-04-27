import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useServiceCatalog } from '@/hooks/use-service-requests'
import { useCreateServiceRequest } from '@/hooks/use-service-requests'
import { CATEGORY_LABELS, type ServiceCatalogItem } from '@/types/service-request'

function CatalogCard({
  item,
  onRequest,
}: {
  item: ServiceCatalogItem
  onRequest: (item: ServiceCatalogItem) => void
}) {
  return (
    <div className="rounded-lg border bg-card p-4 flex flex-col gap-2 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold">{item.name}</h3>
        <span className="text-xs bg-muted text-muted-foreground rounded px-1.5 py-0.5 shrink-0">
          {CATEGORY_LABELS[item.category]}
        </span>
      </div>
      <p className="text-sm text-muted-foreground flex-1">{item.description}</p>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {item.estimated_days != null ? `目安: ${item.estimated_days}日` : '期間: 未定'}
        </span>
        {item.requires_approval && (
          <span className="text-amber-600 font-medium">承認必要</span>
        )}
      </div>
      <button
        onClick={() => onRequest(item)}
        className="mt-1 w-full rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        申請する
      </button>
    </div>
  )
}

function RequestModal({
  item,
  onClose,
}: {
  item: ServiceCatalogItem
  onClose: () => void
}) {
  const navigate = useNavigate()
  const { mutateAsync, isPending } = useCreateServiceRequest()
  const [title, setTitle] = useState(item.name)
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim()) {
      setError('申請内容を入力してください')
      return
    }
    setError(null)
    try {
      const sr = await mutateAsync({
        title,
        description,
        category: item.category,
        catalog_item_id: item.id,
      } as Parameters<typeof mutateAsync>[0])
      onClose()
      navigate(`/service-requests/${sr.id}`)
    } catch {
      setError('申請の送信に失敗しました')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg bg-background border shadow-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">サービス申請: {item.name}</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-lg leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div className="rounded bg-red-50 p-2 text-xs text-red-700">{error}</div>
          )}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              申請タイトル
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full rounded border px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              申請内容・理由 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={4}
              placeholder="申請の詳細や理由を記入してください"
              className="w-full rounded border px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending ? '送信中...' : '申請送信'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function ServiceCatalogPage() {
  const { data: items = [], isLoading, isError } = useServiceCatalog({ is_active: true })
  const [selectedItem, setSelectedItem] = useState<ServiceCatalogItem | null>(null)

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">読み込み中...</div>
  }

  if (isError) {
    return (
      <div className="p-8 text-center text-red-600">
        サービスカタログの読み込みに失敗しました
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">サービスカタログ</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            利用可能なサービスを選択して申請できます
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          利用可能なサービスがありません
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <CatalogCard key={item.id} item={item} onRequest={setSelectedItem} />
          ))}
        </div>
      )}

      {selectedItem && (
        <RequestModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </div>
  )
}
