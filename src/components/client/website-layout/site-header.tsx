'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'
import { List, X, Sparkle } from '@phosphor-icons/react/dist/ssr'
import { Logo } from '@/components/logo'
import type { ContinentTheme } from '../continent-theme'

interface SiteHeaderProps {
  displayName: string
  continentTheme: ContinentTheme
  salonDeTheHref?: string
  mesVoyagesHref?: string
}

// ─── Nav item type ───────────────────────────────────────────────────────────

interface NavItem {
  href: string
  label: string
  /** If set, this nav item is active when pathname starts with this AND tab=messages */
  isSalonDeThe?: boolean
}

// ─── Inner component (uses useSearchParams) ──────────────────────────────────

function SiteHeaderInner({ displayName, continentTheme, salonDeTheHref, mesVoyagesHref }: SiteHeaderProps) {
  const navItems: NavItem[] = [
    { href: '/client', label: 'Accueil' },
    { href: mesVoyagesHref || '/client/voyages', label: 'Mes voyages' },
    { href: salonDeTheHref || '/client', label: 'Salon de Thé', isSalonDeThe: true },
    { href: '/client/aide', label: 'Aide' },
  ]

  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const currentTab = searchParams.get('tab')
  const isOnMessagesTab = pathname.startsWith('/client/voyages/') && currentTab === 'messages'

  const isActive = (item: NavItem) => {
    // "Salon de Thé" is active when we're on a voyage page with tab=messages
    if (item.isSalonDeThe) return isOnMessagesTab
    // "Mes voyages" is active on voyage pages EXCEPT when on tab=messages
    if (item.label === 'Mes voyages') {
      return pathname.startsWith('/client/voyages') && !isOnMessagesTab
    }
    // "Accueil" is active only on exact /client
    if (item.href === '/client') return pathname === '/client'
    // Default: prefix match
    return pathname.startsWith(item.href)
  }

  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <header className="bg-white sticky top-0 z-[100]" style={{ boxShadow: '0 2px 20px rgba(0,0,0,0.05)' }}>
      <div className="flex items-center justify-between px-6 lg:px-10 py-3.5">
        {/* Logo */}
        <div className="flex items-center gap-6">
          <Link href="/client" className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: '#0FB6BC' }}
            >
              N
            </div>
            <span className="font-display font-bold text-lg text-gray-800 hidden sm:block">
              nomadays
            </span>
          </Link>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-sm font-medium transition-colors"
              style={{
                color: isActive(item) ? continentTheme.primary : '#636E72',
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User area */}
        <div className="flex items-center gap-4">
          {/* Fidelity badge - hidden on small screens */}
          <div className="hidden lg:flex items-center gap-1.5 bg-[#FBF6E9] px-3.5 py-1.5 rounded-full">
            <Sparkle size={14} weight="duotone" style={{ color: '#D4A847' }} />
            <span className="text-xs font-semibold" style={{ color: '#D4A847' }}>
              Grand Voyageur
            </span>
          </div>

          {/* Profile link */}
          <Link href="/client/profil">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm cursor-pointer hover:opacity-90 transition-opacity"
              style={{ backgroundColor: continentTheme.accent }}
            >
              {initials || '?'}
            </div>
          </Link>

          {/* Mobile hamburger */}
          <button
            className="md:hidden h-10 w-10 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menu"
          >
            {mobileMenuOpen ? (
              <X size={20} weight="duotone" className="text-gray-700" />
            ) : (
              <List size={20} weight="duotone" className="text-gray-700" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <nav className="md:hidden border-t border-gray-100 bg-white px-6 py-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{
                backgroundColor: isActive(item) ? `${continentTheme.primary}15` : 'transparent',
                color: isActive(item) ? continentTheme.primary : '#636E72',
              }}
            >
              {item.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-gray-100 mt-2">
            <Link
              href="/client/profil"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500"
            >
              Mon profil
            </Link>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-gray-600"
              >
                Deconnexion
              </button>
            </form>
          </div>
        </nav>
      )}
    </header>
  )
}

// ─── Exported component with Suspense ────────────────────────────────────────

export function SiteHeader(props: SiteHeaderProps) {
  return (
    <Suspense fallback={
      <header className="bg-white sticky top-0 z-[100] h-[58px]" style={{ boxShadow: '0 2px 20px rgba(0,0,0,0.05)' }} />
    }>
      <SiteHeaderInner {...props} />
    </Suspense>
  )
}
