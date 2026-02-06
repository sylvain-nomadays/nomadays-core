import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Logo } from '@/components/logo'
import { NotificationsBell } from '@/components/notifications/notifications-bell'
import {
  LayoutDashboard,
  FolderKanban,
  Map,
  Users,
  Building2,
  Settings,
  HelpCircle,
  LogOut,
  Plane,
  Truck,
  LayoutTemplate,
} from 'lucide-react'

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/dossiers', label: 'Dossiers', icon: FolderKanban },
  { href: '/admin/calendar', label: 'Calendrier A/D', icon: Plane },
  { href: '/admin/circuits', label: 'Circuits', icon: Map },
  { href: '/admin/suppliers', label: 'Fournisseurs', icon: Truck },
  { href: '/admin/templates', label: 'Templates', icon: LayoutTemplate },
  { href: '/admin/participants', label: 'Participants', icon: Users },
  { href: '/admin/tenants', label: 'DMC / Agences', icon: Building2 },
]

const bottomNavItems = [
  { href: '/admin/settings', label: 'Paramètres', icon: Settings },
  { href: '/admin/help', label: 'Aide', icon: HelpCircle },
]

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-sidebar flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b">
          <Link href="/admin/dashboard">
            <Logo className="h-7" />
          </Link>
        </div>

        {/* Main navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Bottom navigation */}
        <div className="p-3 space-y-1 border-t">
          {bottomNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </div>

        {/* User section */}
        <div className="p-3 border-t bg-sidebar-accent/50">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
              {user.email?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.email ?? 'Utilisateur'}</p>
              <p className="text-xs text-muted-foreground">Admin</p>
            </div>
          </div>
          <form action="/auth/signout" method="post" className="mt-3">
            <button
              type="submit"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full px-2 py-1.5 rounded hover:bg-sidebar-accent"
            >
              <LogOut className="h-4 w-4" />
              Déconnexion
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header with notifications */}
        <header className="h-14 border-b bg-background flex items-center justify-end px-6 gap-4">
          <NotificationsBell />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{user.email}</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto bg-background">{children}</main>
      </div>
    </div>
  )
}
