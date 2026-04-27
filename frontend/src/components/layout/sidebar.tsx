import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  AlertCircle,
  ClipboardList,
  BookOpen,
  GitBranch,
  CheckSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { path: '/', label: 'ダッシュボード', icon: LayoutDashboard },
  { path: '/incidents', label: 'インシデント管理', icon: AlertCircle },
  { path: '/service-requests', label: 'サービスリクエスト', icon: ClipboardList },
  { path: '/service-catalog', label: 'サービスカタログ', icon: BookOpen },
  { path: '/change-requests', label: '変更管理', icon: GitBranch },
  { path: '/approvals', label: '承認キュー', icon: CheckSquare },
]

export function Sidebar() {
  const location = useLocation()

  return (
    <aside className="hidden md:flex w-64 flex-col bg-card border-r border-border">
      <div className="flex h-16 items-center px-6 border-b border-border">
        <span className="text-lg font-semibold text-foreground">ITIL</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon
            // Exact match for root, prefix match for others
            const isActive =
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path)

            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.path === '/'}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}
