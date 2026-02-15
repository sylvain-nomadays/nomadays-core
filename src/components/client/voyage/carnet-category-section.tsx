'use client'

import { useState } from 'react'
import { CaretDown } from '@phosphor-icons/react'
import {
  Stamp,
  Suitcase,
  CurrencyDollar,
  WifiHigh,
  FirstAidKit,
  CloudSun,
  HandsPraying,
} from '@phosphor-icons/react'
import type { ContinentTheme } from '../continent-theme'
import type { TravelInfoCategory, ChecklistEntry } from '@/lib/actions/travel-info'
import { CarnetItem } from './carnet-item'

// ─── Icon map ─────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, typeof Stamp> = {
  Stamp,
  Suitcase,
  CurrencyDollar,
  WifiHigh,
  FirstAidKit,
  CloudSun,
  HandsPraying,
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface CarnetCategorySectionProps {
  category: TravelInfoCategory
  checklist: ChecklistEntry[]
  continentTheme: ContinentTheme
  defaultOpen?: boolean
  onToggle: (categoryKey: string, itemKey: string) => Promise<void>
  onUpdateNotes: (categoryKey: string, itemKey: string, notes: string) => Promise<void>
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CarnetCategorySection({
  category,
  checklist,
  continentTheme,
  defaultOpen = false,
  onToggle,
  onUpdateNotes,
}: CarnetCategorySectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  // Count checked items
  const checkedCount = category.items.filter((item) =>
    checklist.some(
      (c) => c.category_key === category.key && c.item_key === item.key && c.is_checked
    )
  ).length
  const totalCount = category.items.length

  // Icon
  const Icon = ICON_MAP[category.icon] || Stamp

  return (
    <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-sm">
      {/* Header — clickable */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50/50 transition-colors"
      >
        {/* Icon badge */}
        <div
          className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: continentTheme.light }}
        >
          <Icon
            size={20}
            weight="duotone"
            style={{ color: continentTheme.primary }}
          />
        </div>

        {/* Label */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-800">
            {category.label}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {totalCount} {totalCount > 1 ? 'points' : 'point'} à vérifier
          </p>
        </div>

        {/* Counter badge */}
        {checkedCount > 0 && (
          <span
            className="flex-shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold text-white"
            style={{ backgroundColor: continentTheme.primary }}
          >
            {checkedCount}/{totalCount} ✓
          </span>
        )}

        {/* Chevron */}
        <CaretDown
          size={16}
          weight="bold"
          className={`flex-shrink-0 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Content — expandable */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-5 pb-4 space-y-2">
          {category.items.map((item) => {
            const entry = checklist.find(
              (c) => c.category_key === category.key && c.item_key === item.key
            )
            return (
              <CarnetItem
                key={item.key}
                item={item}
                categoryKey={category.key}
                isChecked={entry?.is_checked || false}
                notes={entry?.notes || null}
                continentTheme={continentTheme}
                onToggle={onToggle}
                onUpdateNotes={onUpdateNotes}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
