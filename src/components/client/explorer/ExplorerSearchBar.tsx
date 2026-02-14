'use client'

import {
  MagnifyingGlass,
  GlobeSimple,
  GlobeHemisphereEast,
  GlobeHemisphereWest,
  Church,
  Mountains,
  Island,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { CONTINENT_FILTERS } from '@/lib/types/explorer'
import type { ExplorerContinent } from '@/lib/types/explorer'

// ─── Icon lookup ─────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, Icon> = {
  GlobeSimple,
  GlobeHemisphereEast,
  GlobeHemisphereWest,
  Church,
  Mountains,
  Island,
}

// ─── Component ───────────────────────────────────────────────────────────────

interface ExplorerSearchBarProps {
  search: string
  onSearchChange: (value: string) => void
  activeContinent: ExplorerContinent | 'all'
  onContinentChange: (value: ExplorerContinent | 'all') => void
  resultCount: number
}

export function ExplorerSearchBar({
  search,
  onSearchChange,
  activeContinent,
  onContinentChange,
  resultCount,
}: ExplorerSearchBarProps) {
  return (
    <div className="flex flex-col gap-3 px-6 py-4 bg-white border-b border-gray-100">
      {/* Search input */}
      <div className="relative">
        <MagnifyingGlass
          size={18}
          weight="duotone"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          placeholder="Rechercher un pays, une destination..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:bg-white focus:border-[#D4A847] focus:ring-2 focus:ring-[#D4A847]/20 outline-none transition-all placeholder:text-gray-400"
        />
      </div>

      {/* Continent filter buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        {CONTINENT_FILTERS.map((filter) => {
          const isActive = filter.value === activeContinent
          const IconComponent = ICON_MAP[filter.icon]

          return (
            <button
              key={filter.value}
              onClick={() => onContinentChange(filter.value)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5"
              style={
                isActive
                  ? {
                      backgroundColor: filter.color,
                      color: '#FFFFFF',
                      boxShadow: `0 1px 4px ${filter.color}40`,
                    }
                  : {
                      backgroundColor: '#F3F4F6',
                      color: '#4B5563',
                    }
              }
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = '#E5E7EB'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = '#F3F4F6'
                }
              }}
            >
              {IconComponent && (
                <IconComponent
                  size={15}
                  weight="duotone"
                  style={{ color: isActive ? '#FFFFFF' : filter.color }}
                />
              )}
              {filter.label}
            </button>
          )
        })}

        {/* Result count */}
        <span className="ml-auto text-xs text-gray-400">
          {resultCount} destination{resultCount !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  )
}
