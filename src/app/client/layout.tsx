import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Logo } from '@/components/logo'
import {
  Home,
  FolderHeart,
  Heart,
  User,
  Settings,
  HelpCircle,
  LogOut,
  MessageSquare,
} from 'lucide-react'

const navItems = [
  { href: '/client', label: 'Accueil', icon: Home },
  { href: '/client/voyages', label: 'Mes Voyages', icon: FolderHeart },
  { href: '/client/wishlist', label: 'Liste d\'envies', icon: Heart },
  { href: '/client/messages', label: 'Messages', icon: MessageSquare },
]

const bottomNavItems = [
  { href: '/client/profil', label: 'Mon Profil', icon: User },
  { href: '/client/aide', label: 'Aide', icon: HelpCircle },
]

export default async function ClientLayout({
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

  // Récupérer les infos du participant
  const { data: participantData } = user.email
    ? await supabase
        .from('participants')
        .select('id, first_name, last_name, email')
        .eq('email', user.email)
        .single()
    : { data: null }

  const participant = participantData as {
    id: string
    first_name: string
    last_name: string
    email: string
  } | null

  const displayName = participant
    ? `${participant.first_name} ${participant.last_name}`
    : user.email

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-sidebar flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b">
          <Link href="/client">
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
              {displayName?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground">Voyageur</p>
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
        {/* Page content */}
        <main className="flex-1 overflow-auto bg-background">{children}</main>
      </div>
    </div>
  )
}
