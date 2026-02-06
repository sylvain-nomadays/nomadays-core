'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import type { TravelTheme } from '@/lib/api/types';

// Default icons for themes (emoji fallback if no icon specified)
const THEME_ICONS: Record<string, string> = {
  randonnee: '🥾',
  trekking: '🏔️',
  equestre: '🐴',
  famille: '👨‍👩‍👧‍👦',
  luxe: '✨',
  aventure: '🧗',
  culture: '🏛️',
  gastronomie: '🍽️',
  nature: '🌿',
  sport: '⚽',
  plage: '🏖️',
  bien_etre: '🧘',
  photographie: '📷',
  observation: '🔭',
  histoire: '📜',
  spirituel: '🕉️',
  artisanat: '🎨',
  oenologie: '🍷',
};

interface ThemeCheckboxGridProps {
  themes: TravelTheme[];
  selectedIds: number[];
  onChange: (selectedIds: number[]) => void;
  disabled?: boolean;
  className?: string;
  columns?: 2 | 3 | 4;
}

export function ThemeCheckboxGrid({
  themes,
  selectedIds,
  onChange,
  disabled = false,
  className,
  columns = 3,
}: ThemeCheckboxGridProps) {
  const handleToggle = (themeId: number) => {
    if (disabled) return;

    if (selectedIds.includes(themeId)) {
      onChange(selectedIds.filter(id => id !== themeId));
    } else {
      onChange([...selectedIds, themeId]);
    }
  };

  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
  };

  return (
    <div className={cn('grid gap-2', gridCols[columns], className)}>
      {themes.map((theme) => {
        const isSelected = selectedIds.includes(theme.id);
        const icon = theme.icon || THEME_ICONS[theme.code] || '🏷️';

        return (
          <label
            key={theme.id}
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all select-none',
              isSelected
                ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => handleToggle(theme.id)}
              disabled={disabled}
              className="sr-only"
            />
            <span className="text-lg flex-shrink-0">{icon}</span>
            <span className={cn(
              'text-sm font-medium truncate',
              isSelected ? 'text-emerald-800' : 'text-gray-700'
            )}>
              {theme.label}
            </span>
            {isSelected && (
              <svg
                className="w-4 h-4 ml-auto text-emerald-600 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </label>
        );
      })}
    </div>
  );
}

// Export default themes for seeding
export const DEFAULT_THEMES = [
  { code: 'randonnee', label: 'Randonnée' },
  { code: 'trekking', label: 'Trekking' },
  { code: 'equestre', label: 'Équestre' },
  { code: 'famille', label: 'Famille' },
  { code: 'luxe', label: 'Luxe' },
  { code: 'aventure', label: 'Aventure' },
  { code: 'culture', label: 'Culture' },
  { code: 'gastronomie', label: 'Gastronomie' },
  { code: 'nature', label: 'Nature' },
  { code: 'sport', label: 'Sport' },
  { code: 'plage', label: 'Plage & Détente' },
  { code: 'bien_etre', label: 'Bien-être' },
  { code: 'photographie', label: 'Photographie' },
  { code: 'observation', label: 'Observation animalière' },
  { code: 'histoire', label: 'Histoire' },
  { code: 'spirituel', label: 'Spirituel' },
  { code: 'artisanat', label: 'Artisanat' },
  { code: 'oenologie', label: 'Oenologie' },
];
