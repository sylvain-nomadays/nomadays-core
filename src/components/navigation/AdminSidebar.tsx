'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/logo';
import { SectionSwitcher } from './SectionSwitcher';
import {
  sections,
  navItemsBySection,
  navGroupedBySection,
  getSectionFromPath,
  isNavGroup,
  type AppSection,
  type NavItem,
  type NavGroup,
  type SectionNavItems,
} from '@/config/navigation';

interface AdminSidebarProps {
  userEmail: string;
  userRole?: string;
}

function NavItemLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
        isActive
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
      )}
    >
      <item.icon className="h-4 w-4" />
      {item.label}
      {item.badge && (
        <span className="ml-auto text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

export function AdminSidebar({ userEmail, userRole = 'Admin' }: AdminSidebarProps) {
  const pathname = usePathname();
  const currentSection = getSectionFromPath(pathname);
  const sectionConfig = sections[currentSection];
  const groupedNav = navGroupedBySection[currentSection];
  const flatNav = navItemsBySection[currentSection];

  return (
    <aside className="w-64 border-r bg-sidebar flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b">
        <Link href="/admin/dashboard">
          <Logo className="h-7" />
        </Link>
      </div>

      {/* Section Switcher */}
      <div className="p-3 border-b">
        <SectionSwitcher currentSection={currentSection} />
      </div>

      {/* Main navigation - contextuel à la section */}
      <nav className="flex-1 p-3 overflow-y-auto">
        {groupedNav ? (
          /* Navigation groupée (ex: CMS avec sous-sections) */
          <div className="space-y-4">
            {groupedNav.map((entry, idx) => {
              if (isNavGroup(entry)) {
                return (
                  <div key={entry.label}>
                    <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {entry.label}
                    </div>
                    <div className="space-y-0.5 mt-0.5">
                      {entry.items.map((item) => (
                        <NavItemLink key={item.href} item={item} pathname={pathname} />
                      ))}
                    </div>
                  </div>
                );
              }
              return <NavItemLink key={entry.href} item={entry} pathname={pathname} />;
            })}
          </div>
        ) : (
          /* Navigation plate (sections classiques) */
          <div className="space-y-1">
            {flatNav.map((item) => (
              <NavItemLink key={item.href} item={item} pathname={pathname} />
            ))}
          </div>
        )}
      </nav>

      {/* Bottom navigation */}
      <div className="p-3 space-y-1 border-t">
        <Link
          href="/admin/help"
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        >
          <HelpCircle className="h-4 w-4" />
          Aide
        </Link>
      </div>

      {/* User section */}
      <div className="p-3 border-t bg-sidebar-accent/50">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
            {userEmail?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{userEmail ?? 'Utilisateur'}</p>
            <p className="text-xs text-muted-foreground">{userRole}</p>
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
  );
}
