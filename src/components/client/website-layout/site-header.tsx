'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, Suspense } from 'react'
import {
  List, X, Question, Coin, Camera, SignOut, UserCircle, House, GlobeSimple,
  Binoculars, Compass, MapTrifold, Airplane, GlobeHemisphereWest, Sparkle,
} from '@phosphor-icons/react/dist/ssr'
import type { ContinentTheme } from '../continent-theme'

// ─── Fidelity icon mapping ──────────────────────────────────────────────────

const FIDELITY_ICON_MAP: Record<string, React.ComponentType<any>> = {
  Binoculars,
  Compass,
  MapTrifold,
  Airplane,
  GlobeHemisphereWest,
  Sparkle,
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface SiteHeaderProps {
  displayName: string
  continentTheme: ContinentTheme
  /** Label du tier de fidélité (ex: "Grand Voyageur") */
  fidelityTierLabel?: string
  /** Couleur du tier de fidélité (ex: "#DD9371") */
  fidelityTierColor?: string
  /** Nom de l'icône Phosphor du tier (ex: "Airplane") */
  fidelityTierIconName?: string
}

// ─── Nav items ──────────────────────────────────────────────────────────────

interface NavItem {
  href: string
  label: string
  Icon?: React.ComponentType<any>
}

const mainNavItems: NavItem[] = [
  { href: '/client', label: 'Accueil', Icon: House },
  { href: '/client/explorer', label: 'Explorer', Icon: GlobeSimple },
  { href: '/client/credits', label: 'Crédits Nomadays', Icon: Coin },
  { href: '/client/souvenirs', label: 'Mes Souvenirs', Icon: Camera },
  { href: '/client/aide', label: 'Aide', Icon: Question },
]

// ─── Inner component ────────────────────────────────────────────────────────

function SiteHeaderInner({
  displayName,
  continentTheme,
  fidelityTierLabel,
  fidelityTierColor,
  fidelityTierIconName,
}: SiteHeaderProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const isActive = (item: NavItem) => {
    if (item.href === '/client') return pathname === '/client'
    return pathname.startsWith(item.href)
  }

  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  // Resolve fidelity icon
  const tierColor = fidelityTierColor || '#A3A3A3'
  const tierLabel = fidelityTierLabel || 'A l\'Horizon'
  const TierIcon = FIDELITY_ICON_MAP[fidelityTierIconName || 'Binoculars'] || Binoculars
  // Lighten the tier color for background (10% opacity)
  const tierBgColor = `${tierColor}18`

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
          {mainNavItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-1.5 text-sm font-medium transition-colors"
              style={{
                color: isActive(item) ? continentTheme.primary : '#636E72',
              }}
            >
              {item.Icon && (
                <item.Icon
                  size={15}
                  weight={isActive(item) ? 'fill' : 'duotone'}
                />
              )}
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User area */}
        <div className="flex items-center gap-4">
          {/* Fidelity badge - hidden on small screens */}
          <div
            className="hidden lg:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full"
            style={{ backgroundColor: tierBgColor }}
          >
            <TierIcon size={14} weight="duotone" style={{ color: tierColor }} />
            <span className="text-xs font-semibold" style={{ color: tierColor }}>
              {tierLabel}
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
              <X size={20} weight="bold" className="text-gray-700" />
            ) : (
              <List size={20} weight="bold" className="text-gray-700" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <nav className="md:hidden border-t border-gray-100 bg-white px-6 py-4 space-y-1">
          {/* Mobile fidelity badge */}
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl mb-2"
            style={{ backgroundColor: tierBgColor }}
          >
            <TierIcon size={16} weight="duotone" style={{ color: tierColor }} />
            <span className="text-xs font-semibold" style={{ color: tierColor }}>
              {tierLabel}
            </span>
          </div>

          {mainNavItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{
                backgroundColor: isActive(item) ? `${continentTheme.primary}15` : 'transparent',
                color: isActive(item) ? continentTheme.primary : '#636E72',
              }}
            >
              {item.Icon && (
                <item.Icon
                  size={16}
                  weight={isActive(item) ? 'fill' : 'duotone'}
                />
              )}
              {item.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-gray-100 mt-2 space-y-1">
            <Link
              href="/client/profil"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500"
            >
              <UserCircle size={16} weight="duotone" />
              Mon profil
            </Link>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="flex items-center gap-2.5 w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-gray-600"
              >
                <SignOut size={16} weight="duotone" />
                Déconnexion
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
