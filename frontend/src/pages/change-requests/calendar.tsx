import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useChangeScheduleCalendar } from '@/hooks/use-change-requests'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('ja-JP', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

function addMonths(d: Date, n: number) {
  const result = new Date(d)
  result.setMonth(result.getMonth() + n)
  return result
}

export function ChangeScheduleCalendarPage() {
  const today = new Date()
  const [monthBase, setMonthBase] = useState(new Date(today.getFullYear(), today.getMonth(), 1))

  const fromDate = isoDate(monthBase)
  const toDate = isoDate(new Date(monthBase.getFullYear(), monthBase.getMonth() + 1, 0))

  const { data: items = [], isLoading, isError } = useChangeScheduleCalendar(fromDate, toDate)

  const monthLabel = monthBase.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })

  const dayMap: Record<string, typeof items> = {}
  for (const item of items) {
    const day = item.scheduled_start.slice(0, 10)
    ;(dayMap[day] ??= []).push(item)
  }

  const daysInMonth = new Date(monthBase.getFullYear(), monthBase.getMonth() + 1, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(monthBase.getFullYear(), monthBase.getMonth(), i + 1)
    return isoDate(d)
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">変更スケジュールカレンダー</h1>
        <Link
          to="/change-requests"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← 変更申請一覧
        </Link>
      </div>

      {/* Month navigation */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setMonthBase((b) => addMonths(b, -1))}
          className="rounded border px-3 py-1 text-sm hover:bg-muted"
        >
          ← 前月
        </button>
        <span className="text-base font-semibold">{monthLabel}</span>
        <button
          onClick={() => setMonthBase((b) => addMonths(b, 1))}
          className="rounded border px-3 py-1 text-sm hover:bg-muted"
        >
          翌月 →
        </button>
        <button
          onClick={() => setMonthBase(new Date(today.getFullYear(), today.getMonth(), 1))}
          className="ml-auto rounded border px-3 py-1 text-sm text-primary hover:bg-muted"
        >
          今月
        </button>
      </div>

      {isLoading && (
        <p className="text-center text-sm text-muted-foreground">読み込み中...</p>
      )}

      {isError && (
        <p className="text-center text-sm text-red-600">データの取得に失敗しました</p>
      )}

      {!isLoading && !isError && items.length === 0 && (
        <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
          この月に予定されている変更はありません
        </div>
      )}

      {/* Calendar grid */}
      {!isLoading && !isError && (
        <div className="grid gap-2">
          {days.map((day) => {
            const dayItems = dayMap[day] ?? []
            const isToday = day === isoDate(today)
            return (
              <div
                key={day}
                className={`rounded-lg border p-3 ${isToday ? 'border-primary bg-primary/5' : 'bg-card'}`}
              >
                <p className={`text-xs font-semibold mb-1 ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                  {new Date(day + 'T00:00:00').toLocaleDateString('ja-JP', {
                    month: 'short',
                    day: 'numeric',
                    weekday: 'short',
                  })}
                  {isToday && <span className="ml-2 rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">今日</span>}
                </p>
                {dayItems.length === 0 ? (
                  <p className="text-xs text-muted-foreground/40">—</p>
                ) : (
                  <ul className="space-y-1">
                    {dayItems.map((item) => (
                      <li key={`${item.change_request_id}-${item.scheduled_start}`}>
                        <Link
                          to={`/change-requests/${item.change_request_id}`}
                          className="flex items-center gap-2 rounded bg-blue-50 px-2 py-1 text-xs text-blue-800 hover:bg-blue-100"
                        >
                          <span className="font-medium">{formatDate(item.scheduled_start)} 〜 {formatDate(item.scheduled_end)}</span>
                          <span className="truncate">{item.title}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
