import { useToastStore } from '@/store/toast-store'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
}

const bgMap = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
}

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => {
        const Icon = iconMap[t.type]
        return (
          <div
            key={t.id}
            className={`flex items-start gap-2 rounded-lg border p-3 shadow-lg animate-in slide-in-from-right ${bgMap[t.type]}`}
          >
            <Icon className="h-4 w-4 mt-0.5 shrink-0" />
            <p className="text-sm flex-1">{t.message}</p>
            <button
              onClick={() => removeToast(t.id)}
              className="shrink-0 hover:opacity-70"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
