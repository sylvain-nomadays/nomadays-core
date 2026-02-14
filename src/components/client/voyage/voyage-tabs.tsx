'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Suspense } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

// ─── Types ───────────────────────────────────────────────────────────────────

interface TabConfig {
  value: string;
  label: string;
  badge?: number;
}

interface VoyageTabsProps {
  tabs: TabConfig[];
  children: React.ReactNode;
}

// ─── Valid tab values ────────────────────────────────────────────────────────

const VALID_TABS = ['proposals', 'program', 'infos', 'flights', 'travelers', 'messages', 'documents'];

// ─── Inner component (needs Suspense boundary for useSearchParams) ──────────

function VoyageTabsInner({ tabs, children }: VoyageTabsProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const tabParam = searchParams.get('tab');
  const activeTab = tabParam && VALID_TABS.includes(tabParam) ? tabParam : 'proposals';

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'proposals') {
      params.delete('tab');
    } else {
      params.set('tab', value);
    }
    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ''}`, { scroll: false });
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="sticky top-0 z-20 mb-6 flex-wrap h-auto gap-1 bg-[#F8F9FA]/95 backdrop-blur-sm py-3 -mx-8 px-8 lg:-mx-10 lg:px-10 print:hidden">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
            {tab.badge != null && tab.badge > 0 && (
              <span className="ml-1.5 text-xs bg-gray-100 text-gray-600 rounded-full px-1.5 py-0.5">
                {tab.badge}
              </span>
            )}
          </TabsTrigger>
        ))}
      </TabsList>
      {children}
    </Tabs>
  );
}

// ─── Exported component with Suspense ────────────────────────────────────────

export function VoyageTabs({ tabs, children }: VoyageTabsProps) {
  return (
    <Suspense fallback={
      <div className="animate-pulse">
        <div className="h-10 bg-gray-100 rounded-lg mb-6 w-full max-w-lg" />
        <div className="h-64 bg-gray-50 rounded-xl" />
      </div>
    }>
      <VoyageTabsInner tabs={tabs} children={children} />
    </Suspense>
  );
}
