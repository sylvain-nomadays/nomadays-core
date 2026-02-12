'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, FileText, MapPin, Loader2, Car, Building2, Moon } from 'lucide-react';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useDayBlocks, useCreateBlock, useUpdateBlock, useDeleteBlock } from '@/hooks/useBlocks';
import { useCreateItem } from '@/hooks/useFormulaItems';
import { useTripConditions } from '@/hooks/useConditions';
import { findActiveVariant } from '@/lib/conditionUtils';
import { TextBlock } from './TextBlock';
import { ActivityBlock } from './ActivityBlock';
import { AccommodationBlock } from './AccommodationBlock';
import { AccommodationVariantGroup } from './AccommodationVariantGroup';
import { AccommodationSelectorDialog } from './AccommodationSelectorDialog';
import { TransportBlock } from './TransportBlock';
import type { Formula, CostNature, Accommodation, RoomCategory, RoomRate } from '@/lib/api/types';
import type { IntraBlockDragData } from '../dnd/types';

/**
 * Info about an accommodation block — used to propagate multi-night
 * hotels to subsequent days ("ghost block" display).
 */
export interface AccommodationInfo {
  /** Hotel name (e.g. "Mandarin Oriental ★★★★★") */
  hotelName: string;
  /** Total number of nights */
  nights: number;
  /** Day number where the accommodation block lives (1-based) */
  sourceDayNumber: number;
  /** Whether breakfast is included */
  breakfastIncluded: boolean;
  /** Whether lunch is included */
  lunchIncluded: boolean;
  /** Whether dinner is included */
  dinnerIncluded: boolean;
}

/**
 * Linked accommodation from a previous day — displayed as a read-only
 * ghost block in the current day.
 */
export interface LinkedAccommodation {
  /** Hotel name */
  hotelName: string;
  /** Which night this is (e.g. 2 for "night 2 of 3") */
  nightNumber: number;
  /** Total nights */
  totalNights: number;
  /** Day number where the original block lives */
  sourceDayNumber: number;
  /** Whether breakfast is included */
  breakfastIncluded: boolean;
  /** Whether lunch is included */
  lunchIncluded: boolean;
  /** Whether dinner is included */
  dinnerIncluded: boolean;
}

interface DayBlockListProps {
  tripId: number;
  dayId: number;
  dayNumber: number;
  /** Legacy description from TripDay.description */
  legacyDescription?: string;
  /** Location name from TripDay.location_to (e.g. "Ayutthaya") */
  locationTo?: string;
  /** Trip start date (ISO string) for season/rate resolution */
  tripStartDate?: string;
  onRefetch?: () => void;
  /** Callback to register sortable block IDs for this day (used by CircuitDndProvider) */
  onBlocksLoaded?: (dayId: number, blockIds: number[]) => void;
  /** Cost natures for ItemEditor (passed to TransportBlock) */
  costNatures?: CostNature[];
  /** Number of trip days for ItemEditor day range (passed to TransportBlock) */
  tripDays?: number;
  /** Callback to report this day's accommodation info to parent (for multi-night propagation) */
  onAccommodationLoaded?: (dayNumber: number, info: AccommodationInfo | null) => void;
  /** Callback to report meals from activity blocks in this day */
  onActivityMealsChanged?: (dayNumber: number, meals: { breakfast: boolean; lunch: boolean; dinner: boolean }) => void;
  /** Linked accommodation from a previous day (multi-night ghost block) */
  linkedAccommodation?: LinkedAccommodation;
  /** Version counter to trigger re-fetch of trip conditions when they change in ConditionsPanel */
  conditionsVersion?: number;
  /** Trip-level room demand (passed to AccommodationBlock for room allocation) */
  tripRoomDemand?: import('@/lib/api/types').RoomDemandEntry[];
  /** VAT calculation mode — hides TTC/HT toggle on items when 'on_margin' */
  vatMode?: 'on_margin' | 'on_selling_price';
}

/**
 * Wrapper for sortable blocks using @dnd-kit.
 * Attaches drag data so the CircuitDndProvider can identify the block.
 *
 * Note: No inner DndContext — the SortableContext registers with
 * the nearest ancestor DndContext (CircuitDndProvider).
 */
function SortableBlock({
  block,
  dayId,
  tripId,
  onUpdate,
  onDelete,
  onRefetch,
  costNatures,
  tripDays,
  dayNumber,
  vatMode,
}: {
  block: Formula;
  dayId: number;
  tripId: number;
  onUpdate: (data: { name?: string; description_html?: string }) => void;
  onDelete: () => void;
  onRefetch?: () => void;
  costNatures?: CostNature[];
  tripDays?: number;
  dayNumber?: number;
  vatMode?: 'on_margin' | 'on_selling_price';
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: block.id,
    data: {
      type: 'block',
      block,
      dayId,
    } satisfies IntraBlockDragData,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {block.block_type === 'text' ? (
        <TextBlock
          block={block}
          onUpdate={onUpdate}
          onDelete={onDelete}
          dragListeners={listeners}
          dragAttributes={attributes}
        />
      ) : block.block_type === 'transport' ? (
        <TransportBlock
          block={block}
          tripId={tripId}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onRefetch={onRefetch}
          dragListeners={listeners}
          dragAttributes={attributes}
          costNatures={costNatures}

          tripDays={tripDays}
          dayNumber={dayNumber}
          vatMode={vatMode}
        />
      ) : (
        <ActivityBlock
          block={block}
          tripId={tripId}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onRefetch={onRefetch}
          dragListeners={listeners}
          dragAttributes={attributes}
          costNatures={costNatures}

          tripDays={tripDays}
          dayNumber={dayNumber}
          vatMode={vatMode}
          onMealsChanged={() => {
            // Trigger refetch to rescan activity meals
            onRefetch?.();
          }}
        />
      )}
    </div>
  );
}

/**
 * Parse accommodation metadata from description_html JSON.
 */
function parseAccommodationMeta(descriptionHtml?: string): {
  nights?: number;
  breakfast_included?: boolean;
  lunch_included?: boolean;
  dinner_included?: boolean;
} | null {
  if (!descriptionHtml) return null;
  try {
    const parsed = JSON.parse(descriptionHtml);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch {
    // Not JSON
  }
  return null;
}

export function DayBlockList({
  tripId,
  dayId,
  dayNumber,
  legacyDescription,
  locationTo,
  tripStartDate,
  onRefetch,
  onBlocksLoaded,
  costNatures,
  tripDays,
  onAccommodationLoaded,
  onActivityMealsChanged,
  linkedAccommodation,
  conditionsVersion,
  tripRoomDemand,
  vatMode,
}: DayBlockListProps) {
  const { data: blocks, loading, refetch: refetchBlocks } = useDayBlocks(dayId);
  const { mutate: createBlock, loading: creating } = useCreateBlock();
  const { mutate: updateBlock } = useUpdateBlock();
  const { mutate: deleteBlock } = useDeleteBlock();
  const { mutate: createItem } = useCreateItem();
  const { tripConditions } = useTripConditions(tripId, conditionsVersion);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [showAccommodationSelector, setShowAccommodationSelector] = useState(false);

  // Track previous accommodation info to avoid unnecessary parent updates
  const prevAccomInfoRef = useRef<string>('');

  // Report accommodation info to parent whenever blocks change
  // For variant groups, only report the active variant
  useEffect(() => {
    if (!onAccommodationLoaded || !blocks) return;

    const accomBlocks = blocks.filter(b => b.block_type === 'accommodation');

    // Find the "effective" accommodation block:
    // - If there are variant groups (condition_id set), use the active variant
    // - Otherwise use the first standalone block
    let effectiveBlock: Formula | undefined;

    const variantBlocks = accomBlocks.filter(b => b.condition_id);
    const standaloneBlocks = accomBlocks.filter(b => !b.condition_id);

    if (variantBlocks.length > 0) {
      // Group by condition_id, take active from first group
      const firstConditionId = variantBlocks[0]?.condition_id;
      if (firstConditionId) {
        const group = variantBlocks.filter(b => b.condition_id === firstConditionId);
        effectiveBlock = findActiveVariant(group, firstConditionId, tripConditions);
      }
    } else if (standaloneBlocks.length > 0) {
      effectiveBlock = standaloneBlocks[0];
    }

    if (effectiveBlock && effectiveBlock.name !== 'Hébergement non défini') {
      const meta = parseAccommodationMeta(effectiveBlock.description_html);
      const nights = meta?.nights ?? 1;
      const info: AccommodationInfo = {
        hotelName: effectiveBlock.name || 'Hébergement',
        nights,
        sourceDayNumber: dayNumber,
        breakfastIncluded: meta?.breakfast_included ?? true,
        lunchIncluded: meta?.lunch_included ?? false,
        dinnerIncluded: meta?.dinner_included ?? false,
      };
      const key = JSON.stringify(info);
      if (key !== prevAccomInfoRef.current) {
        prevAccomInfoRef.current = key;
        onAccommodationLoaded(dayNumber, info);
      }
    } else {
      if (prevAccomInfoRef.current !== '') {
        prevAccomInfoRef.current = '';
        onAccommodationLoaded(dayNumber, null);
      }
    }
  }, [blocks, dayNumber, onAccommodationLoaded, tripConditions]);

  // Report activity meals to parent whenever blocks change
  const prevActivityMealsRef = useRef<string>('');
  useEffect(() => {
    if (!onActivityMealsChanged || !blocks) return;

    let hasBreakfast = false;
    let hasLunch = false;
    let hasDinner = false;

    for (const b of blocks) {
      if (b.block_type !== 'activity') continue;
      // Parse meals metadata from description_html: <!--meals:{"breakfast":true}-->
      const mealMatch = b.description_html?.match(/^<!--meals:(.*?)-->/);
      if (mealMatch && mealMatch[1]) {
        try {
          const meals = JSON.parse(mealMatch[1]);
          if (meals.breakfast) hasBreakfast = true;
          if (meals.lunch) hasLunch = true;
          if (meals.dinner) hasDinner = true;
        } catch { /* ignore */ }
      }
    }

    const key = `${hasBreakfast}-${hasLunch}-${hasDinner}`;
    if (key !== prevActivityMealsRef.current) {
      prevActivityMealsRef.current = key;
      onActivityMealsChanged(dayNumber, { breakfast: hasBreakfast, lunch: hasLunch, dinner: hasDinner });
    }
  }, [blocks, dayNumber, onActivityMealsChanged]);

  const handleRefetch = () => {
    refetchBlocks();
    onRefetch?.();
  };

  const handleCreateBlock = async (blockType: 'text' | 'activity' | 'transport' | 'accommodation') => {
    setAddMenuOpen(false);
    const currentBlocks = blocks || [];
    const nonAccommodationBlocks = currentBlocks.filter(b => b.block_type !== 'accommodation' && b.block_type !== 'roadbook');
    const nextSortOrder = nonAccommodationBlocks.length;

    const nameMap = {
      text: 'Texte',
      activity: 'Nouvelle activité',
      transport: 'Déplacement',
      accommodation: 'Hébergement non défini',
    } as const;

    // Default metadata for specific block types
    const defaultMeta: Record<string, string> = {
      transport: JSON.stringify({ travel_mode: 'driving' }),
      accommodation: JSON.stringify({ nights: 1, breakfast_included: true }),
    };

    try {
      await createBlock({
        dayId,
        name: nameMap[blockType],
        blockType,
        descriptionHtml: defaultMeta[blockType] || undefined,
        sortOrder: nextSortOrder,
      });
      handleRefetch();
    } catch (err) {
      console.error('Failed to create block:', err);
    }
  };

  const handleUpdateBlock = async (formulaId: number, data: { name?: string; description_html?: string }) => {
    try {
      await updateBlock({ formulaId, data });
    } catch (err) {
      console.error('Failed to update block:', err);
    }
  };

  const handleDeleteBlock = async (formulaId: number) => {
    try {
      await deleteBlock(formulaId);
      handleRefetch();
    } catch (err) {
      console.error('Failed to delete block:', err);
    }
  };

  // ─── Dialog-first accommodation creation ───────────────────────────
  const handleAccommodationSelected = async (selection: {
    accommodation: Accommodation;
    roomCategory: RoomCategory;
    resolvedRate?: RoomRate;
  }) => {
    const { accommodation, roomCategory, resolvedRate } = selection;
    const starText = accommodation.star_rating ? ' ' + '★'.repeat(accommodation.star_rating) : '';

    // Meal plan from rate
    const mealPlan = resolvedRate?.meal_plan;
    const hasBreakfast = mealPlan ? mealPlan !== 'RO' : true;
    const hasLunch = mealPlan === 'FB' || mealPlan === 'AI';
    const hasDinner = mealPlan === 'HB' || mealPlan === 'FB' || mealPlan === 'AI';

    const currentBlocks = blocks || [];
    const accommodationCount = currentBlocks.filter(b => b.block_type === 'accommodation').length;

    try {
      // 1. Create block with full metadata (no placeholder!)
      const newBlock = await createBlock({
        dayId,
        name: `${accommodation.name}${starText}`,
        blockType: 'accommodation',
        descriptionHtml: JSON.stringify({
          accommodation_id: accommodation.id,
          selected_room_category_id: roomCategory.id,
          nights: 1,
          breakfast_included: hasBreakfast,
          lunch_included: hasLunch,
          dinner_included: hasDinner,
        }),
        sortOrder: accommodationCount,
      });

      // 2. Create room item with resolved rate
      if (newBlock?.id) {
        const unitCost = resolvedRate?.cost ?? 0;
        const currency = resolvedRate?.currency ?? 'THB';
        await createItem({
          formulaId: newBlock.id,
          data: {
            name: `${roomCategory.name}${roomCategory.available_bed_types?.length ? ' ' + roomCategory.available_bed_types.join('/') : ''}`,
            supplier_id: accommodation.supplier_id,
            unit_cost: unitCost,
            currency: currency,
            pricing_method: 'quotation',
            ratio_categories: 'adult',
            ratio_per: 1,
            ratio_type: 'set',
            times_type: 'fixed',
            times_value: 1,
            sort_order: 0,
            seasons: [],
          },
        });
      }

      handleRefetch();
    } catch (err) {
      console.error('Failed to create accommodation block:', err);
    }
  };

  // Separate accommodation & roadbook blocks from sortable programme blocks
  // Roadbook annotations live exclusively in the Roadbook tab
  const sortableBlocks = (blocks || []).filter(b => b.block_type !== 'accommodation' && b.block_type !== 'roadbook');
  const accommodationBlocks = (blocks || []).filter(b => b.block_type === 'accommodation');

  // Group accommodation blocks: standalone (no condition) vs variant groups (by condition_id)
  const standaloneAccommodation = accommodationBlocks.filter(b => !b.condition_id);
  const variantGroupsMap = new Map<number, Formula[]>();
  for (const b of accommodationBlocks) {
    if (b.condition_id) {
      const group = variantGroupsMap.get(b.condition_id) || [];
      group.push(b);
      variantGroupsMap.set(b.condition_id, group);
    }
  }

  // Legacy compat: single accommodation block reference (for the add menu warning)
  const accommodationBlock = accommodationBlocks[0];

  // Handler to add a new variant to an existing group
  const handleAddVariant = async (conditionId: number, optionId: number) => {
    try {
      const newBlock = await createBlock({
        dayId,
        name: 'Hébergement non défini',
        blockType: 'accommodation',
        descriptionHtml: JSON.stringify({ nights: 1, breakfast_included: true }),
        sortOrder: accommodationBlocks.length,
        conditionId,
      });
      // Set condition_option_id on a placeholder item
      if (newBlock?.id) {
        await createItem({
          formulaId: newBlock.id,
          data: {
            name: 'Chambre à définir',
            unit_cost: 0,
            currency: 'THB',
            ratio_type: 'set',
            ratio_per: 1,
            ratio_categories: 'adult',
            times_type: 'fixed',
            times_value: 1,
            pricing_method: 'quotation',
            condition_option_id: optionId,
            sort_order: 0,
          },
        });
      }
      handleRefetch();
    } catch (err) {
      console.error('Failed to add variant:', err);
    }
  };

  // Register block IDs with parent for reorder calculations
  const sortableIds = sortableBlocks.map(b => b.id);
  // Use an effect-like pattern: call onBlocksLoaded whenever the block list changes
  // This is called during render which is fine for a simple callback
  if (onBlocksLoaded && sortableIds.length > 0) {
    // Schedule for after render to avoid state updates during render
    queueMicrotask(() => onBlocksLoaded(dayId, sortableIds));
  }

  // Check if we have legacy description but no text blocks
  const hasLegacyText = legacyDescription && legacyDescription.trim().length > 0;
  const hasTextBlocks = sortableBlocks.some(b => b.block_type === 'text');

  if (loading && !blocks) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-400">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        <span className="text-sm">Chargement des blocs...</span>
      </div>
    );
  }

  return (
    <div className="space-y-2 pt-3">
      {/* Legacy description (if exists and no text blocks) */}
      {hasLegacyText && !hasTextBlocks && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3">
          <div className="flex items-start justify-between gap-2 mb-2">
            <span className="text-xs text-gray-400 italic">Description existante (ancienne version)</span>
            <button
              onClick={async () => {
                await createBlock({
                  dayId,
                  name: 'Texte',
                  blockType: 'text',
                  descriptionHtml: legacyDescription,
                  sortOrder: 0,
                });
                handleRefetch();
              }}
              className="text-xs text-[#0FB6BC] hover:text-[#0C9296] font-medium"
            >
              Convertir en bloc
            </button>
          </div>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{legacyDescription}</p>
        </div>
      )}

      {/* Sortable blocks (text + activity) — uses ancestor DndContext from CircuitDndProvider */}
      <SortableContext
        items={sortableIds}
        strategy={verticalListSortingStrategy}
      >
        {sortableBlocks.map((block) => (
          <SortableBlock
            key={block.id}
            block={block}
            dayId={dayId}
            tripId={tripId}
            onUpdate={(data) => handleUpdateBlock(block.id, data)}
            onDelete={() => handleDeleteBlock(block.id)}
            onRefetch={handleRefetch}
            costNatures={costNatures}
            tripDays={tripDays}
            dayNumber={dayNumber}
            vatMode={vatMode}
          />
        ))}
      </SortableContext>

      {/* Add block button */}
      <Popover open={addMenuOpen} onOpenChange={setAddMenuOpen}>
        <PopoverTrigger asChild>
          <button
            disabled={creating}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-gray-200 text-gray-400 hover:border-[#99E7EB] hover:text-[#0C9296] hover:bg-[#E6F9FA]/50 transition-all text-sm"
          >
            {creating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Ajouter un bloc
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-1" align="center">
          <button
            onClick={() => handleCreateBlock('text')}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            <FileText className="w-4 h-4 text-gray-400" />
            Texte narratif
          </button>
          <button
            onClick={() => handleCreateBlock('activity')}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            <MapPin className="w-4 h-4 text-[#0FB6BC]" />
            Activité
          </button>
          <button
            onClick={() => handleCreateBlock('transport')}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            <Car className="w-4 h-4 text-[#DD9371]" />
            Déplacement
          </button>
          <button
            onClick={() => {
              // Warn if accommodation already exists (own block or linked from another day)
              if (accommodationBlock) {
                if (!window.confirm('Ce jour a déjà un bloc hébergement. Voulez-vous en ajouter un deuxième ?')) return;
              } else if (linkedAccommodation) {
                if (!window.confirm(
                  `Un hébergement est déjà prévu depuis le jour ${linkedAccommodation.sourceDayNumber} (${linkedAccommodation.hotelName}, nuit ${linkedAccommodation.nightNumber}/${linkedAccommodation.totalNights}). Voulez-vous quand même ajouter un hébergement sur ce jour ?`
                )) return;
              }
              setAddMenuOpen(false);
              setShowAccommodationSelector(true);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            <Building2 className="w-4 h-4 text-amber-500" />
            Hébergement
            {(accommodationBlock || linkedAccommodation) && (
              <span className="ml-auto text-orange-400 text-xs">⚠</span>
            )}
          </button>
        </PopoverContent>
      </Popover>

      {/* Accommodation blocks (fixed at bottom) */}

      {/* Variant groups (accommodation blocks sharing a condition_id) */}
      {Array.from(variantGroupsMap.entries()).map(([cId, variants]) => (
        <AccommodationVariantGroup
          key={`variant-group-${cId}`}
          variants={variants}
          conditionId={cId}
          tripConditions={tripConditions}
          tripId={tripId}
          dayId={dayId}
          dayNumber={dayNumber}
          locationHint={locationTo}
          tripStartDate={tripStartDate}
          costNatures={costNatures}
          tripDays={tripDays}
          tripRoomDemand={tripRoomDemand}
          onRefetch={handleRefetch}
          onAddVariant={handleAddVariant}
        />
      ))}

      {/* Standalone accommodation blocks (no condition_id — legacy/simple) */}
      {standaloneAccommodation.map((accomBlock) => (
        <div className="mt-3" key={accomBlock.id}>
          <AccommodationBlock
            block={accomBlock}
            tripId={tripId}
            dayId={dayId}
            dayNumber={dayNumber}
            locationHint={locationTo}
            tripStartDate={tripStartDate}
            tripConditions={tripConditions}
            tripRoomDemand={tripRoomDemand}
            onRefetch={handleRefetch}
            onDelete={() => handleDeleteBlock(accomBlock.id)}
            onConvertToVariants={async (conditionId: number) => {
              // Convert standalone block to variant group
              try {
                // 1. Set condition_id on this block
                await updateBlock({ formulaId: accomBlock.id, data: { condition_id: conditionId } });

                // 2. Set condition_option_id on existing item
                const tc = tripConditions.find(c => c.condition_id === conditionId);
                const existingItem = (accomBlock.items || [])[0];
                if (tc && existingItem && tc.selected_option_id) {
                  const { useUpdateItem } = await import('@/hooks/useFormulaItems');
                  // Can't call hooks here, use apiClient directly
                  const { apiClient } = await import('@/lib/api/client');
                  await apiClient.patch(`/trip-structure/items/${existingItem.id}`, {
                    condition_option_id: tc.selected_option_id,
                  });
                }

                // 3. Create empty blocks for remaining options
                if (tc) {
                  const remainingOptions = (tc.options || []).filter(
                    o => o.id !== tc.selected_option_id,
                  );
                  for (const opt of remainingOptions) {
                    const newBlock = await createBlock({
                      dayId,
                      name: 'Hébergement non défini',
                      blockType: 'accommodation',
                      descriptionHtml: JSON.stringify({ nights: 1, breakfast_included: true }),
                      sortOrder: accommodationBlocks.length,
                      conditionId,
                    });
                    if (newBlock?.id) {
                      await createItem({
                        formulaId: newBlock.id,
                        data: {
                          name: 'Chambre à définir',
                          unit_cost: 0,
                          currency: 'THB',
                          ratio_type: 'set',
                          ratio_per: 1,
                          ratio_categories: 'adult',
                          times_type: 'fixed',
                          times_value: 1,
                          pricing_method: 'quotation',
                          condition_option_id: opt.id,
                          sort_order: 0,
                        },
                      });
                    }
                  }
                }

                handleRefetch();
              } catch (err) {
                console.error('Failed to convert to variants:', err);
              }
            }}
          />
        </div>
      ))}

      {/* Accommodation selector dialog (dialog-first flow) */}
      <AccommodationSelectorDialog
        open={showAccommodationSelector}
        onOpenChange={setShowAccommodationSelector}
        locationHint={locationTo}
        tripStartDate={tripStartDate}
        dayNumber={dayNumber}
        onSelect={handleAccommodationSelected}
      />

      {/* Ghost block: linked accommodation from a previous day (multi-night) */}
      {accommodationBlocks.length === 0 && linkedAccommodation && (
        <div className="mt-3 rounded-lg border border-dashed border-amber-200 bg-amber-50/20 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-medium text-amber-400 uppercase tracking-wide">
                Hébergement
              </span>
              <div className="text-sm text-gray-500 truncate">
                {linkedAccommodation.hotelName}
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Moon className="w-3 h-3 text-amber-300" />
              <span className="text-xs text-amber-500 font-medium">
                Nuit {linkedAccommodation.nightNumber}/{linkedAccommodation.totalNights}
              </span>
            </div>
          </div>
          <div className="mt-1 text-xs text-gray-400 italic">
            Depuis le jour {linkedAccommodation.sourceDayNumber}
            {linkedAccommodation.breakfastIncluded && (
              <span className="ml-2">· Petit-déjeuner inclus</span>
            )}
          </div>
        </div>
      )}

      {/* Warning: linked accommodation exists but this day also has its own accommodation */}
      {accommodationBlocks.length > 0 && linkedAccommodation && (
        <div className="mt-2 rounded-md border border-orange-300 bg-orange-50 px-3 py-2 flex items-start gap-2">
          <span className="text-orange-500 mt-0.5 text-sm">⚠</span>
          <div className="text-xs text-orange-700">
            <span className="font-medium">Attention :</span> Un hébergement est déjà prévu depuis le jour {linkedAccommodation.sourceDayNumber} ({linkedAccommodation.hotelName}, nuit {linkedAccommodation.nightNumber}/{linkedAccommodation.totalNights}). Deux hébergements sont configurés pour cette nuit.
          </div>
        </div>
      )}
    </div>
  );
}
