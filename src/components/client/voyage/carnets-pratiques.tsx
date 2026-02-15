'use client'

import { useState, useEffect, useCallback } from 'react'
import { BookOpen, SpinnerGap } from '@phosphor-icons/react'
import type { ContinentTheme } from '../continent-theme'
import type {
  TravelInfoCategory,
  ChecklistEntry,
} from '@/lib/actions/travel-info'
import {
  toggleChecklistItem,
  updateChecklistNotes,
} from '@/lib/actions/travel-info'
import { CarnetCategorySection } from './carnet-category-section'

// ─── Types ───────────────────────────────────────────────────────────────────

interface CarnetsPratiquesProps {
  dossierId: string
  participantId: string
  continentTheme: ContinentTheme
  countryName: string
  /** Pre-fetched merged categories (SSR) */
  initialCategories: TravelInfoCategory[]
  /** Pre-fetched checklist (SSR) */
  initialChecklist: ChecklistEntry[]
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CarnetsPratiques({
  dossierId,
  participantId,
  continentTheme,
  countryName,
  initialCategories,
  initialChecklist,
}: CarnetsPratiquesProps) {
  const [categories] = useState<TravelInfoCategory[]>(initialCategories)
  const [checklist, setChecklist] = useState<ChecklistEntry[]>(initialChecklist)

  // ── Toggle checkbox (optimistic) ──────────────────────────────────────────

  const handleToggle = useCallback(
    async (categoryKey: string, itemKey: string) => {
      // Optimistic update
      setChecklist((prev) => {
        const existing = prev.find(
          (c) => c.category_key === categoryKey && c.item_key === itemKey
        )
        if (existing) {
          return prev.map((c) =>
            c.category_key === categoryKey && c.item_key === itemKey
              ? { ...c, is_checked: !c.is_checked }
              : c
          )
        }
        // New entry
        return [
          ...prev,
          {
            category_key: categoryKey,
            item_key: itemKey,
            is_checked: true,
            notes: null,
          },
        ]
      })

      // Server action
      try {
        await toggleChecklistItem({
          dossierId,
          participantId,
          categoryKey,
          itemKey,
        })
      } catch (err) {
        console.error('[carnets] Toggle failed:', err)
        // Revert — re-fetch would be better but this is simpler
        setChecklist((prev) =>
          prev.map((c) =>
            c.category_key === categoryKey && c.item_key === itemKey
              ? { ...c, is_checked: !c.is_checked }
              : c
          )
        )
      }
    },
    [dossierId, participantId]
  )

  // ── Update notes ──────────────────────────────────────────────────────────

  const handleUpdateNotes = useCallback(
    async (categoryKey: string, itemKey: string, notes: string) => {
      // Optimistic update
      setChecklist((prev) => {
        const existing = prev.find(
          (c) => c.category_key === categoryKey && c.item_key === itemKey
        )
        if (existing) {
          return prev.map((c) =>
            c.category_key === categoryKey && c.item_key === itemKey
              ? { ...c, notes }
              : c
          )
        }
        return [
          ...prev,
          {
            category_key: categoryKey,
            item_key: itemKey,
            is_checked: false,
            notes,
          },
        ]
      })

      try {
        await updateChecklistNotes({
          dossierId,
          participantId,
          categoryKey,
          itemKey,
          notes,
        })
      } catch (err) {
        console.error('[carnets] Update notes failed:', err)
      }
    },
    [dossierId, participantId]
  )

  // ── Empty state ───────────────────────────────────────────────────────────

  if (!categories || categories.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="h-12 w-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <BookOpen size={24} weight="duotone" className="text-gray-300" />
        </div>
        <p className="text-sm text-gray-500">
          Les carnets pratiques de votre destination seront bientôt disponibles ici.
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Votre conseiller prépare les informations essentielles pour votre voyage.
        </p>
      </div>
    )
  }

  // ── Overall progress ──────────────────────────────────────────────────────

  const totalItems = categories.reduce((sum, cat) => sum + cat.items.length, 0)
  const checkedItems = checklist.filter((c) => c.is_checked).length
  const progressPct = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0

  return (
    <div className="space-y-4">
      {/* Header with progress */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">
            Carnet pratique
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Tout ce qu&apos;il faut savoir pour votre voyage {countryName ? `— ${countryName}` : ''}
          </p>
        </div>

        {/* Progress indicator */}
        {totalItems > 0 && (
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-right">
              <p className="text-xs font-medium text-gray-700">
                {checkedItems}/{totalItems} complété{checkedItems > 1 ? 's' : ''}
              </p>
              <p className="text-[10px] text-gray-400">{progressPct}%</p>
            </div>
            <div className="w-12 h-12 relative">
              <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
                {/* Background circle */}
                <circle
                  cx="18"
                  cy="18"
                  r="15.9"
                  fill="none"
                  stroke="#f3f4f6"
                  strokeWidth="3"
                />
                {/* Progress circle */}
                <circle
                  cx="18"
                  cy="18"
                  r="15.9"
                  fill="none"
                  stroke={continentTheme.primary}
                  strokeWidth="3"
                  strokeDasharray={`${progressPct} ${100 - progressPct}`}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gray-600">
                {progressPct}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Categories */}
      <div className="space-y-3">
        {categories.map((category, idx) => (
          <CarnetCategorySection
            key={category.key}
            category={category}
            checklist={checklist}
            continentTheme={continentTheme}
            defaultOpen={idx === 0}
            onToggle={handleToggle}
            onUpdateNotes={handleUpdateNotes}
          />
        ))}
      </div>
    </div>
  )
}
