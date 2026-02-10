'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  sections,
  sectionOrder,
  navItemsBySection,
  type AppSection,
} from '@/config/navigation';

interface SectionSwitcherProps {
  currentSection: AppSection;
  className?: string;
}

export function SectionSwitcher({ currentSection, className }: SectionSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const current = sections[currentSection];
  const containerRef = useRef<HTMLDivElement>(null);

  // Fermer le menu quand on clique en dehors
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSectionChange = (sectionId: AppSection) => {
    const firstNavItem = navItemsBySection[sectionId][0];
    if (firstNavItem) {
      setIsOpen(false);
      router.push(firstNavItem.href);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg w-full',
          'text-left transition-colors',
          'hover:bg-sidebar-accent',
          current.color,
          className
        )}
      >
        <current.icon className="h-5 w-5" />
        <div className="flex-1 min-w-0">
          <span className="font-semibold text-sm">{current.label}</span>
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 transition-transform text-muted-foreground',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 z-50 bg-popover border rounded-md shadow-lg p-1">
          {sectionOrder.map((sectionId) => {
            const section = sections[sectionId];
            const isActive = sectionId === currentSection;

            return (
              <button
                key={sectionId}
                type="button"
                onClick={() => handleSectionChange(sectionId)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 w-full rounded-sm text-left',
                  'hover:bg-accent hover:text-accent-foreground transition-colors',
                  isActive && 'bg-accent'
                )}
              >
                <div className={cn('p-1.5 rounded-md', section.color)}>
                  <section.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{section.label}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {section.description}
                  </p>
                </div>
                {isActive && <Check className="h-4 w-4 text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
