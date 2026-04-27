import { cn } from '@/lib/utils'
import type { SLAStatus } from '@/types/incident'

interface SLAIndicatorProps {
  sla: SLAStatus
  className?: string
}

export function SLAIndicator({ sla, className }: SLAIndicatorProps) {
  if (!sla.sla_due_at) {
    return <span className="text-xs text-muted-foreground">SLA未設定</span>
  }

  const remaining = sla.remaining_minutes

  if (sla.is_overdue) {
    const overdueMinutes = remaining !== null ? Math.abs(remaining) : 0
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 text-xs font-medium text-red-700',
          className,
        )}
      >
        <span className="h-2 w-2 rounded-full bg-red-500" />
        SLA超過 ({overdueMinutes}分)
      </span>
    )
  }

  const hours = remaining !== null ? Math.floor(remaining / 60) : null
  const mins = remaining !== null ? remaining % 60 : null
  const isWarning = remaining !== null && remaining < 60

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium',
        isWarning ? 'text-orange-700' : 'text-green-700',
        className,
      )}
    >
      <span
        className={cn(
          'h-2 w-2 rounded-full',
          isWarning ? 'bg-orange-500' : 'bg-green-500',
        )}
      />
      {hours !== null && mins !== null ? `残 ${hours}時間${mins}分` : '計算中...'}
    </span>
  )
}
