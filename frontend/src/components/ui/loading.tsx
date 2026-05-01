import { Loader2 } from 'lucide-react'

interface LoadingProps {
  text?: string
}

export function LoadingFallback({ text = '読み込み中...' }: LoadingProps) {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      <span className="ml-2 text-sm text-muted-foreground">{text}</span>
    </div>
  )
}
