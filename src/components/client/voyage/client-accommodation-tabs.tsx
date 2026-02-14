'use client';

import { useState } from 'react';

interface VariantTab {
  formulaId: number;
  label: string;
  isDefault: boolean;
}

interface ClientAccommodationTabsProps {
  variants: VariantTab[];
  continentTheme: { primary: string };
  children: React.ReactNode[];
}

/**
 * Classeur-style tabs for accommodation variants (Budget / Classique / Deluxe).
 * Client component — only this part needs interactivity.
 */
export function ClientAccommodationTabs({
  variants,
  continentTheme,
  children,
}: ClientAccommodationTabsProps) {
  const defaultIndex = variants.findIndex((v) => v.isDefault);
  const [activeIndex, setActiveIndex] = useState(defaultIndex >= 0 ? defaultIndex : 0);

  if (variants.length <= 1) {
    return <>{children[0]}</>;
  }

  return (
    <div>
      {/* Tab headers — classeur style */}
      <div className="flex items-end gap-0.5">
        {variants.map((v, i) => (
          <button
            key={v.formulaId}
            onClick={() => setActiveIndex(i)}
            className={`px-3 py-1.5 text-xs font-medium rounded-t-lg border transition-all ${
              i === activeIndex
                ? 'bg-white border-gray-200 border-b-white text-gray-800 relative z-10'
                : 'bg-gray-50 border-gray-100 text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            }`}
            style={i === activeIndex ? { color: continentTheme.primary } : undefined}
          >
            {v.label}
          </button>
        ))}
      </div>
      {/* Active variant content */}
      <div className="border border-gray-200 rounded-b-lg rounded-tr-lg -mt-px">
        {children[activeIndex]}
      </div>
    </div>
  );
}
