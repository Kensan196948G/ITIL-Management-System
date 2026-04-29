import { cn } from '@/lib/utils'
import {
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  type ProblemPriority,
  type ProblemStatus,
} from '@/types/problem'

export function ProblemStatusBadge({ status }: { status: ProblemStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        STATUS_COLORS[status]
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}

export function ProblemPriorityBadge({ priority }: { priority: ProblemPriority }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        PRIORITY_COLORS[priority]
      )}
    >
      {PRIORITY_LABELS[priority]}
    </span>
  )
}
