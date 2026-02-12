'use client';

import { useMemo } from 'react';
import { Plus, X } from 'lucide-react';
import { AccommodationBlock } from './AccommodationBlock';
import { useTripConditions } from '@/hooks/useConditions';
import { useDeleteBlock } from '@/hooks/useBlocks';
import { findActiveVariant, getVariantOptionLabel } from '@/lib/conditionUtils';
import type { Formula, CostNature, TripCondition, ConditionOption, RoomDemandEntry } from '@/lib/api/types';
import type { AccommodationInfo } from './DayBlockList';

interface AccommodationVariantGroupProps {
  /** All accommodation blocks sharing the same condition_id */
  variants: Formula[];
  /** The shared condition_id */
  conditionId: number;
  /** Trip conditions (for determining active variant) */
  tripConditions: TripCondition[];
  tripId: number;
  dayId: number;
  dayNumber: number;
  locationHint?: string;
  tripStartDate?: string;
  costNatures?: CostNature[];
  tripDays?: number;
  onRefetch: () => void;
  onAccommodationLoaded?: (dayNumber: number, info: AccommodationInfo | null) => void;
  /** Called when user wants to add a new variant */
  onAddVariant?: (conditionId: number, optionId: number) => void;
  /** Trip-level room demand (passed through to AccommodationBlock) */
  tripRoomDemand?: RoomDemandEntry[];
}

export function AccommodationVariantGroup({
  variants,
  conditionId,
  tripConditions,
  tripId,
  dayId,
  dayNumber,
  locationHint,
  tripStartDate,
  onRefetch,
  onAddVariant,
  tripRoomDemand,
}: AccommodationVariantGroupProps) {
  const { update: updateTripCondition } = useTripConditions(tripId);
  const { mutate: deleteBlock } = useDeleteBlock();

  // Find the TripCondition for this group
  const tripCondition = useMemo(
    () => tripConditions.find(tc => tc.condition_id === conditionId),
    [tripConditions, conditionId],
  );

  // Build tabs: one per variant, sorted by condition option sort_order
  const tabs = useMemo(() => {
    if (!tripCondition) return [];

    return variants
      .map(variant => {
        const item = (variant.items || [])[0];
        const optionId = item?.condition_option_id;
        const option = optionId
          ? (tripCondition.options || []).find((o: ConditionOption) => o.id === optionId)
          : null;

        return {
          variant,
          optionId: optionId ?? null,
          label: option?.label || 'Non assigné',
          sortOrder: option?.sort_order ?? 999,
        };
      })
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [variants, tripCondition]);

  // Determine active variant
  const activeVariant = findActiveVariant(variants, conditionId, tripConditions);
  const activeOptionId = tripCondition?.selected_option_id ?? null;

  // Find condition options not yet assigned to any variant (for "+" tab)
  const unassignedOptions = useMemo(() => {
    if (!tripCondition) return [];
    const assignedOptionIds = new Set(
      tabs.map(t => t.optionId).filter(Boolean),
    );
    return (tripCondition.options || []).filter(
      (o: ConditionOption) => !assignedOptionIds.has(o.id),
    );
  }, [tripCondition, tabs]);

  // Switch active tab = update trip condition selected_option_id
  const handleTabClick = async (optionId: number) => {
    if (!tripCondition || optionId === activeOptionId) return;
    try {
      await updateTripCondition({
        tripConditionId: tripCondition.id,
        data: { selected_option_id: optionId },
      });
    } catch (err) {
      console.error('Failed to switch variant:', err);
    }
  };

  // Delete a variant
  const handleDeleteVariant = async (formulaId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Supprimer cette variante d\'hébergement ?')) return;
    try {
      await deleteBlock(formulaId);
      onRefetch();
    } catch (err) {
      console.error('Failed to delete variant:', err);
    }
  };

  if (!tripCondition || tabs.length === 0) return null;

  return (
    <div className="mt-3">
      {/* ─── Tabs row ─────────────────────────────────────────── */}
      <div className="flex items-end gap-0.5 px-1">
        {tabs.map((tab) => {
          const isActive = tab.optionId === activeOptionId;

          return (
            <button
              key={tab.variant.id}
              onClick={() => tab.optionId && handleTabClick(tab.optionId)}
              className={`
                relative group/tab flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-t-lg border border-b-0 transition-all
                ${isActive
                  ? 'bg-amber-50/80 border-amber-200 text-amber-800 z-10 -mb-px'
                  : 'bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 z-0'
                }
              `}
            >
              {/* Colored dot */}
              <span
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  isActive ? 'bg-amber-500' : 'bg-gray-400'
                }`}
              />
              {tab.label}

              {/* Delete button on hover (not for active tab or if only 1 variant) */}
              {tabs.length > 1 && (
                <span
                  onClick={(e) => handleDeleteVariant(tab.variant.id, e)}
                  className="ml-0.5 p-0.5 rounded opacity-0 group-hover/tab:opacity-100 hover:bg-red-100 hover:text-red-600 transition-all"
                  title="Supprimer cette variante"
                >
                  <X className="w-2.5 h-2.5" />
                </span>
              )}
            </button>
          );
        })}

        {/* "+" tab to add missing variants */}
        {unassignedOptions.length > 0 && (
          <div className="relative group/add">
            <button
              className="flex items-center gap-1 px-2 py-1.5 text-xs text-gray-400 hover:text-amber-600 rounded-t-lg border border-b-0 border-dashed border-gray-200 hover:border-amber-300 hover:bg-amber-50/50 transition-all"
              title="Ajouter une variante"
            >
              <Plus className="w-3 h-3" />
            </button>
            {/* Dropdown on hover */}
            <div className="absolute top-full left-0 mt-0 hidden group-hover/add:block z-20">
              <div className="bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[140px]">
                {unassignedOptions.map((opt: ConditionOption) => (
                  <button
                    key={opt.id}
                    onClick={() => onAddVariant?.(conditionId, opt.id)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-amber-50 hover:text-amber-700 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Active variant body ──────────────────────────────── */}
      <div>
        {/* Render the active AccommodationBlock */}
        {activeVariant && (
          <AccommodationBlock
            block={activeVariant}
            tripId={tripId}
            dayId={dayId}
            dayNumber={dayNumber}
            locationHint={locationHint}
            tripStartDate={tripStartDate}
            tripRoomDemand={tripRoomDemand}
            conditionOptionId={
              (activeVariant.items || [])[0]?.condition_option_id ?? null
            }
            variantLabel={
              getVariantOptionLabel(activeVariant, tripConditions, conditionId)
                || tripCondition.condition_name
            }
            onRefetch={onRefetch}
            onDelete={() => handleDeleteVariant(activeVariant.id, { stopPropagation: () => {} } as React.MouseEvent)}
          />
        )}
      </div>
    </div>
  );
}
