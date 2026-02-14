'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  Home,
  FolderHeart,
  MessageSquare,
  User,
  HelpCircle,
  LogOut,
  Compass,
  Menu,
} from 'lucide-react';
import { Logo } from '@/components/logo';
import { AdvisorCard } from './advisor-card';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import type { ContinentTheme } from '../continent-theme';

// ─── Types ───────────────────────────────────────────────────────────────────

interface TravelerSidebarProps {
  participant: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
  displayName: string;
  activeDossier: {
    id: string;
    title: string;
    destination_country?: string | null;
    status: string;
    travel_date_start?: string | null;
    tenant?: { name: string; logo_url?: string | null } | null;
    advisor?: { first_name: string | null; last_name: string | null; email: string } | null;
  } | null;
  continentTheme: ContinentTheme;
  unreadMessageCount?: number;
  avgResponseTime?: string | null;
}

// ─── Navigation ──────────────────────────────────────────────────────────────

const navItems = [
  { href: '/client', label: 'Accueil', icon: Home },
  { href: '/client/voyages', label: 'Mes Voyages', icon: FolderHeart },
  { href: '/client/messages', label: 'Messages', icon: MessageSquare },
];

const bottomNavItems = [
  { href: '/client/profil', label: 'Mon Profil', icon: User },
  { href: '/client/aide', label: 'Aide', icon: HelpCircle },
];

// ─── Sidebar Content (shared between desktop & mobile) ───────────────────────

function SidebarContent({
  displayName,
  activeDossier,
  continentTheme,
  unreadMessageCount,
  avgResponseTime,
  onNavigate,
}: TravelerSidebarProps & { onNavigate?: () => void }) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/client') return pathname === '/client';
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Logo area */}
      <div className="px-5 py-4 border-b border-black/5">
        <Link href="/client" className="flex items-center gap-3" onClick={onNavigate}>
          <Logo className="h-7" />
        </Link>
        {activeDossier?.tenant?.name && (
          <div className="mt-2 flex items-center gap-2">
            <Compass className="h-3.5 w-3.5" style={{ color: continentTheme.primary }} />
            <span className="text-xs font-medium text-gray-500">
              {activeDossier.tenant.name}
            </span>
          </div>
        )}
      </div>

      {/* Main navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
              style={{
                backgroundColor: active ? `${continentTheme.primary}15` : 'transparent',
                color: active ? continentTheme.primary : '#525252',
              }}
            >
              <item.icon
                className="h-[18px] w-[18px]"
                style={{ color: active ? continentTheme.primary : '#737373' }}
              />
              <span className="flex-1">{item.label}</span>
              {item.href === '/client/messages' && unreadMessageCount != null && unreadMessageCount > 0 && (
                <span
                  className="min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold text-white flex items-center justify-center"
                  style={{ backgroundColor: continentTheme.primary }}
                >
                  {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Advisor card */}
      {activeDossier?.advisor && (
        <div className="px-3 pb-3">
          <AdvisorCard
            advisor={activeDossier.advisor}
            dossierId={activeDossier.id}
            accentColor={continentTheme.primary}
            avgResponseTime={avgResponseTime}
          />
        </div>
      )}

      {/* Bottom navigation */}
      <div className="px-3 py-2 border-t border-black/5 space-y-0.5">
        {bottomNavItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors"
              style={{
                color: active ? continentTheme.primary : '#737373',
              }}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* User section */}
      <div className="px-3 py-3 border-t border-black/5 bg-black/[0.02]">
        <div className="flex items-center gap-3 px-2">
          <div
            className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
            style={{ backgroundColor: continentTheme.accent }}
          >
            {displayName?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{displayName}</p>
            <p className="text-xs text-gray-400">Voyageur</p>
          </div>
        </div>
        <form action="/auth/signout" method="post" className="mt-2">
          <button
            type="submit"
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors w-full px-2 py-1.5 rounded-lg hover:bg-black/5"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </form>
      </div>
    </>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function TravelerSidebar(props: TravelerSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex w-72 flex-col border-r transition-colors duration-300 flex-shrink-0"
        style={{ backgroundColor: props.continentTheme.light }}
      >
        <SidebarContent {...props} />
      </aside>

      {/* Mobile header bar */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 flex items-center justify-between px-4 border-b"
        style={{ backgroundColor: props.continentTheme.light }}
      >
        <button
          onClick={() => setMobileOpen(true)}
          className="h-10 w-10 rounded-xl flex items-center justify-center hover:bg-black/5 transition-colors"
          aria-label="Ouvrir le menu"
        >
          <Menu className="h-5 w-5 text-gray-700" />
        </button>

        <Link href="/client">
          <Logo className="h-6" />
        </Link>

        <div
          className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
          style={{ backgroundColor: props.continentTheme.accent }}
        >
          {props.displayName?.[0]?.toUpperCase() ?? '?'}
        </div>
      </div>

      {/* Mobile sidebar (Sheet) */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-72 p-0 flex flex-col"
          style={{ backgroundColor: props.continentTheme.light }}
          showCloseButton={false}
        >
          <VisuallyHidden.Root>
            <SheetTitle>Menu de navigation</SheetTitle>
          </VisuallyHidden.Root>
          <SidebarContent {...props} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
