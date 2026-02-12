'use client';

import type { IconWeight } from '@phosphor-icons/react';
import {
  Bank,
  Tree,
  Mountains,
  Island,
  UsersThree,
  Sparkle,
  Wine,
  Compass,
  Jeep,
  Sailboat,
  FlowerLotus,
  Confetti,
} from '@phosphor-icons/react';

// ─── Theme → Phosphor icon + Nomadays color mapping ─────────────────────
//
// Codes must match the `code` field from the backend DEFAULT_TRAVEL_THEMES:
//   culture_histoire, nature_faune, aventure_trek, plages_iles, famille,
//   luxe_bien_etre, gastronomie_vins, hors_sentiers, road_trip,
//   croisiere_nautique, spiritualite, evenements_festivals

interface ThemeIconConfig {
  icon: React.ComponentType<{ weight?: IconWeight; size?: number | string; className?: string; style?: React.CSSProperties }>;
  /** Primary color (icon stroke/fill) — from Nomadays palette */
  color: string;
  /** Light background color — derived from primary */
  bgColor: string;
}

const THEME_ICON_MAP: Record<string, ThemeIconConfig> = {
  // 1. Culture & Histoire — Bank icon, terracotta tones
  culture_histoire: {
    icon: Bank,
    color: '#A66244',     // secondary-700
    bgColor: '#FDF5F2',   // secondary-50
  },
  // 2. Nature & Faune — Tree icon, sage tones
  nature_faune: {
    icon: Tree,
    color: '#5A6E52',     // sage-700
    bgColor: '#E9EFE7',   // sage-100
  },
  // 3. Aventure & Trek — Mountains icon, turquoise tones
  aventure_trek: {
    icon: Mountains,
    color: '#096D71',     // primary-700
    bgColor: '#E6F9FA',   // primary-50
  },
  // 4. Plages & Îles — Island icon, turquoise tones
  plages_iles: {
    icon: Island,
    color: '#0FB6BC',     // primary-500 (turquoise)
    bgColor: '#CCF3F5',   // primary-100
  },
  // 5. Famille — UsersThree icon, terracotta tones
  famille: {
    icon: UsersThree,
    color: '#DD9371',     // secondary-500 (terracotta)
    bgColor: '#FDF5F2',   // secondary-50
  },
  // 6. Luxe & Bien-être — Sparkle icon, terracotta/gold tones
  luxe_bien_etre: {
    icon: Sparkle,
    color: '#C97A56',     // secondary-600
    bgColor: '#FBEBE5',   // secondary-100
  },
  // 7. Gastronomie & Vins — Wine icon, terracotta tones
  gastronomie_vins: {
    icon: Wine,
    color: '#834A33',     // secondary-800
    bgColor: '#FDF5F2',   // secondary-50
  },
  // 8. Hors des sentiers battus — Compass icon, sage tones
  hors_sentiers: {
    icon: Compass,
    color: '#8BA080',     // sage-500
    bgColor: '#F4F7F3',   // sage-50
  },
  // 9. Road Trip — Jeep icon, turquoise tones
  road_trip: {
    icon: Jeep,
    color: '#0C9296',     // primary-600
    bgColor: '#E6F9FA',   // primary-50
  },
  // 10. Croisière & Nautique — Sailboat icon, turquoise tones
  croisiere_nautique: {
    icon: Sailboat,
    color: '#096D71',     // primary-700
    bgColor: '#CCF3F5',   // primary-100
  },
  // 11. Spiritualité & Ressourcement — FlowerLotus icon, sage tones
  spiritualite: {
    icon: FlowerLotus,
    color: '#728A68',     // sage-600
    bgColor: '#E9EFE7',   // sage-100
  },
  // 12. Événements & Festivals — Confetti icon, terracotta tones
  evenements_festivals: {
    icon: Confetti,
    color: '#DD9371',     // secondary-500 (terracotta)
    bgColor: '#FBEBE5',   // secondary-100
  },
};

// ─── ThemeIcon component ─────────────────────────────────────────────────

interface ThemeIconProps {
  /** Theme code (e.g. 'culture_histoire', 'nature_faune') */
  code: string;
  /** Icon size in pixels (default: 20) */
  size?: number;
  /** Show background circle/rounded-square (default: true) */
  withBackground?: boolean;
  /** Background size class (default: 'w-9 h-9') */
  bgSize?: string;
  /** Additional className on wrapper */
  className?: string;
}

export function ThemeIcon({
  code,
  size = 20,
  withBackground = true,
  bgSize = 'w-9 h-9',
  className,
}: ThemeIconProps) {
  const config = THEME_ICON_MAP[code];

  // Fallback for unknown theme codes
  if (!config) {
    return (
      <div
        className={`${withBackground ? `${bgSize} rounded-lg flex items-center justify-center bg-gray-100` : 'inline-flex'} ${className || ''}`}
      >
        <Compass weight="duotone" size={size} className="text-gray-400" />
      </div>
    );
  }

  const IconComponent = config.icon;

  if (!withBackground) {
    return (
      <IconComponent
        weight="duotone"
        size={size}
        style={{ color: config.color }}
        className={className}
      />
    );
  }

  return (
    <div
      className={`${bgSize} rounded-lg flex items-center justify-center flex-shrink-0 ${className || ''}`}
      style={{ backgroundColor: config.bgColor }}
    >
      <IconComponent
        weight="duotone"
        size={size}
        style={{ color: config.color }}
      />
    </div>
  );
}

/** Get the raw config for a theme code (useful for custom rendering) */
export function getThemeIconConfig(code: string): ThemeIconConfig | undefined {
  return THEME_ICON_MAP[code];
}

/** All theme codes that have icons */
export const THEMED_CODES = Object.keys(THEME_ICON_MAP);
