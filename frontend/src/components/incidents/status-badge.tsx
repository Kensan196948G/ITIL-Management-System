import { cn } from '@/lib/utils'
import {
  STATUS_COLORS,
  STATUS_LABELS,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  type IncidentStatus,
  type IncidentPriority,
} from '@/types/incident'

interface StatusBadgeProps {
  status: IncidentStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        STATUS_COLORS[status],
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}

interface PriorityBadgeProps {
  priority: IncidentPriority
  className?: string
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        PRIORITY_COLORS[priority],
        className,
      )}
    >
      {PRIORITY_LABELS[priority]}
    </span>
  )
}
