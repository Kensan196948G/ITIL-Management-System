import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  AlertCircle,
  ClipboardList,
  BookOpen,
  GitBranch,
  CheckSquare,
  Users,
  ScrollText,
  Bell,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth-store'

const navItems = [
  { path: '/', label: 'ダッシュボード', icon: LayoutDashboard },
  { path: '/incidents', label: 'インシデント管理', icon: AlertCircle },
  { path: '/service-requests', label: 'サービスリクエスト', icon: ClipboardList },
  { path: '/service-catalog', label: 'サービスカタログ', icon: BookOpen },
  { path: '/change-requests', label: '変更管理', icon: GitBranch },
  { path: '/approvals', label: '承認キュー', icon: CheckSquare },
  { path: '/notifications', label: '通知', icon: Bell },
]

const adminNavItems = [
  { path: '/admin/users', label: 'ユーザー管理', icon: Users },
  { path: '/admin/audit-logs', label: '監査ログ', icon: ScrollText },
  { path: '/admin/sla-policies', label: 'SLAポリシー', icon: Clock },
]

export function Sidebar() {
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'

  function NavItem({ path, label, icon: Icon }: { path: string; label: string; icon: React.ElementType }) {
    const isActive =
      path === '/'
        ? location.pathname === '/'
        : location.pathname.startsWith(path)
    return (
      <li>
        <NavLink
          to={path}
          end={path === '/'}
          className={cn(
            'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
            isActive
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          {label}
        </NavLink>
      </li>
    )
  }

  return (
    <aside className="hidden md:flex w-64 flex-col bg-card border-r border-border">
      <div className="flex h-16 items-center px-6 border-b border-border">
        <span className="text-lg font-semibold text-foreground">ITIL</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {navItems.map((item) => (
            <NavItem key={item.path} {...item} />
          ))}
        </ul>
        {isAdmin && (
          <>
            <p className="px-6 pt-4 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              管理者
            </p>
            <ul className="space-y-1 px-3">
              {adminNavItems.map((item) => (
                <NavItem key={item.path} {...item} />
              ))}
            </ul>
          </>
        )}
      </nav>
    </aside>
  )
}
