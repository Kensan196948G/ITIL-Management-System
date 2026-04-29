import { Link, useLocation } from 'react-router-dom'
import { Home, ChevronRight } from 'lucide-react'

const pathMap: Record<string, string> = {
  incidents: 'インシデント管理',
  'service-requests': 'サービスリクエスト',
  'service-catalog': 'サービスカタログ',
  'change-requests': '変更管理',
  approvals: '承認キュー',
}

interface BreadcrumbItem {
  label: string
  href?: string
}

function buildBreadcrumbs(pathname: string): BreadcrumbItem[] {
  // Remove leading slash and split
  const segments = pathname.replace(/^\//, '').split('/').filter(Boolean)

  const crumbs: BreadcrumbItem[] = [
    { label: 'ホーム', href: '/' },
  ]

  let currentPath = ''
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`
    const isLast = index === segments.length - 1

    // Check if segment is a known path name
    const label = pathMap[segment] ?? (segment.startsWith('#') ? segment : `#${segment}`)

    crumbs.push({
      label,
      href: isLast ? undefined : currentPath,
    })
  })

  return crumbs
}

export function Breadcrumbs() {
  const location = useLocation()
  const crumbs = buildBreadcrumbs(location.pathname)

  // Don't render breadcrumbs on root
  if (location.pathname === '/') {
    return null
  }

  return (
    <nav aria-label="パンくずリスト" className="mb-4">
      <ol className="flex items-center gap-1 text-sm text-muted-foreground">
        {crumbs.map((crumb, index) => (
          <li key={index} className="flex items-center gap-1">
            {index > 0 && <ChevronRight className="h-3 w-3 shrink-0" />}
            {index === 0 ? (
              // Home icon link
              <Link
                to={crumb.href ?? '/'}
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                <Home className="h-3.5 w-3.5" />
                <span>{crumb.label}</span>
              </Link>
            ) : crumb.href ? (
              <Link
                to={crumb.href}
                className="hover:text-foreground transition-colors"
              >
                {crumb.label}
              </Link>
            ) : (
              // Last item - no link
              <span className="text-foreground font-medium">{crumb.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
