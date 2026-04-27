import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, LogOut, ChevronDown } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { cn } from '@/lib/utils'

export function Header() {
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const handleLogout = () => {
    clearAuth()
    localStorage.removeItem('auth-storage')
    navigate('/login')
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      {/* Left: App name */}
      <div className="flex items-center">
        <h1 className="text-xl font-bold text-foreground">
          ITIL Management System
        </h1>
      </div>

      {/* Right: User dropdown */}
      <div className="relative">
        <button
          type="button"
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          onClick={() => setDropdownOpen((prev) => !prev)}
          aria-haspopup="menu"
          aria-expanded={dropdownOpen}
        >
          <User className="h-4 w-4" />
          <span>{user?.full_name ?? user?.email ?? 'ユーザー'}</span>
          <ChevronDown className={cn('h-4 w-4 transition-transform', dropdownOpen && 'rotate-180')} />
        </button>

        {dropdownOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setDropdownOpen(false)}
              aria-hidden="true"
            />
            {/* Dropdown menu */}
            <div
              role="menu"
              className="absolute right-0 z-20 mt-1 w-48 rounded-md border border-border bg-card shadow-md"
            >
              <div className="py-1">
                <div className="px-4 py-2 text-xs text-muted-foreground border-b border-border">
                  {user?.email}
                </div>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  ログアウト
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
