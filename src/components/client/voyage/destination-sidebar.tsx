'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import {
  ClipboardText,
  ChatCircleDots,
  FileText,
  BookOpenText,
  AirplaneTilt,
  UsersThree,
  type Icon as PhosphorIcon,
} from '@phosphor-icons/react'
import type { ContinentTheme } from '../continent-theme'

// ─── Types ───────────────────────────────────────────────────────────────────

interface DestinationSidebarProps {
  hostName: string | null
  hostTitle: string
  hostMessage: string | null
  dossierId: string
  continentTheme: ContinentTheme
  proposalCount: number
  countryName: string
}

// ─── Nav items ───────────────────────────────────────────────────────────────

interface NavItem {
  tab: string
  label: string
  icon: PhosphorIcon
  badge?: number
  section?: string
}

function getNavItems(proposalCount: number): NavItem[] {
  return [
    {
      tab: 'proposals',
      label: 'Propositions',
      icon: ClipboardText,
      badge: proposalCount > 0 ? proposalCount : undefined,
      section: 'Navigation',
    },
    { tab: 'messages', label: 'Salon de Thé', icon: ChatCircleDots, section: 'Navigation' },
    { tab: 'documents', label: 'Documents', icon: FileText, section: 'Navigation' },
    { tab: 'infos', label: 'Carnets pratiques', icon: BookOpenText, section: 'Préparer' },
    { tab: 'flights', label: 'Vols', icon: AirplaneTilt, section: 'Préparer' },
    { tab: 'travelers', label: 'Voyageurs', icon: UsersThree, section: 'Préparer' },
  ]
}

// ─── Inner component (needs Suspense for useSearchParams) ────────────────────

function DestinationSidebarInner({
  hostName,
  hostTitle,
  hostMessage,
  dossierId,
  continentTheme,
  proposalCount,
  countryName,
}: DestinationSidebarProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const currentTab = searchParams.get('tab') || 'proposals'
  const navItems = getNavItems(proposalCount)

  const handleNavClick = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (tab === 'proposals') {
      params.delete('tab')
    } else {
      params.set('tab', tab)
    }
    const query = params.toString()
    router.replace(`${pathname}${query ? `?${query}` : ''}`, { scroll: false })
  }

  // Group nav items by section
  const sections: Record<string, NavItem[]> = {}
  for (const item of navItems) {
    const section = item.section || 'Navigation'
    if (!sections[section]) sections[section] = []
    sections[section].push(item)
  }

  return (
    <aside className="bg-white border-r border-gray-200 p-6 hidden lg:block">
      {/* Host Card */}
      {hostName && (
        <div
          className="rounded-2xl p-5 mb-6"
          style={{ backgroundColor: continentTheme.light }}
        >
          <div className="flex items-center gap-3 mb-3.5">
            <div
              className="w-[52px] h-[52px] rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0"
              style={{
                border: `3px solid ${continentTheme.primary}`,
                backgroundColor: continentTheme.primary,
              }}
            >
              {hostName[0]?.toUpperCase()}
            </div>
            <div>
              <h3 className="font-display font-bold text-[15px] text-gray-800">{hostName}</h3>
              <span className="text-xs" style={{ color: continentTheme.primary }}>
                {hostTitle}
              </span>
            </div>
          </div>

          {hostMessage && (
            <p className="text-[13px] text-gray-700 leading-relaxed italic mb-3.5">
              {hostMessage}
            </p>
          )}

          <Link
            href={`/client/voyages/${dossierId}?tab=messages`}
            className="block text-center text-white py-3 rounded-[10px] text-[13px] font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: continentTheme.primary }}
          >
            <ChatCircleDots size={16} weight="duotone" className="inline mr-1" />
            Discuter avec {hostName.split(' ')[0]}
          </Link>
        </div>
      )}

      {/* Navigation sections */}
      {Object.entries(sections).map(([sectionName, items]) => (
        <div key={sectionName} className="mb-6">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 px-3.5">
            {sectionName}
          </div>
          <nav className="space-y-1">
            {items.map((item) => {
              const isActive = currentTab === item.tab
              const ItemIcon = item.icon
              return (
                <button
                  key={item.tab}
                  onClick={() => handleNavClick(item.tab)}
                  className="flex items-center gap-2.5 w-full px-3.5 py-3 rounded-[10px] text-sm transition-all text-left"
                  style={{
                    backgroundColor: isActive ? continentTheme.light : 'transparent',
                    color: isActive ? continentTheme.primary : '#2D3436',
                    fontWeight: isActive ? 600 : 400,
                  }}
                >
                  <ItemIcon size={18} weight="duotone" style={{ color: isActive ? continentTheme.primary : '#636E72' }} />
                  <span className="flex-1">{item.label}</span>
                  {item.badge != null && (
                    <span
                      className="text-[10px] font-semibold text-white px-2 py-0.5 rounded-[10px]"
                      style={{ backgroundColor: continentTheme.primary }}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        </div>
      ))}
    </aside>
  )
}

// ─── Exported component with Suspense ────────────────────────────────────────

export function DestinationSidebar(props: DestinationSidebarProps) {
  return (
    <Suspense
      fallback={
        <aside className="bg-white border-r border-gray-200 p-6 hidden lg:block">
          <div className="animate-pulse space-y-4">
            <div className="h-40 bg-gray-100 rounded-2xl" />
            <div className="h-8 bg-gray-100 rounded-lg" />
            <div className="h-8 bg-gray-100 rounded-lg" />
            <div className="h-8 bg-gray-100 rounded-lg" />
          </div>
        </aside>
      }
    >
      <DestinationSidebarInner {...props} />
    </Suspense>
  )
}
