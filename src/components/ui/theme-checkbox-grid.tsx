'use client';

import * as React from 'react';
import { Check } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { ThemeIcon, getThemeIconConfig } from '@/components/ui/theme-icon';
import type { TravelTheme } from '@/lib/api/types';

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
        const config = getThemeIconConfig(theme.code);
        const borderColor = config?.color || '#d4d4d4';

        return (
          <label
            key={theme.id}
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all select-none',
              isSelected
                ? 'shadow-sm'
                : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            style={isSelected ? {
              borderColor,
              backgroundColor: config?.bgColor || '#f0fdf4',
            } : undefined}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => handleToggle(theme.id)}
              disabled={disabled}
              className="sr-only"
            />
            <ThemeIcon code={theme.code} size={20} withBackground={false} />
            <span className={cn(
              'text-sm font-medium truncate',
              !isSelected && 'text-gray-700'
            )}
              style={isSelected ? { color: config?.color || '#065f46' } : undefined}
            >
              {theme.label}
            </span>
            {isSelected && (
              <Check
                weight="bold"
                size={16}
                className="ml-auto flex-shrink-0"
                style={{ color: config?.color || '#059669' }}
              />
            )}
          </label>
        );
      })}
    </div>
  );
}

// Export default themes for seeding (must match backend DEFAULT_TRAVEL_THEMES)
export const DEFAULT_THEMES = [
  { code: 'culture_histoire', label: 'Culture & Histoire' },
  { code: 'nature_faune', label: 'Nature & Faune' },
  { code: 'aventure_trek', label: 'Aventure & Trek' },
  { code: 'plages_iles', label: 'Plages & Îles' },
  { code: 'famille', label: 'Famille' },
  { code: 'luxe_bien_etre', label: 'Luxe & Bien-être' },
  { code: 'gastronomie_vins', label: 'Gastronomie & Vins' },
  { code: 'hors_sentiers', label: 'Hors des sentiers battus' },
  { code: 'road_trip', label: 'Road Trip' },
  { code: 'croisiere_nautique', label: 'Croisière & Nautique' },
  { code: 'spiritualite', label: 'Spiritualité & Ressourcement' },
  { code: 'evenements_festivals', label: 'Événements & Festivals' },
];
