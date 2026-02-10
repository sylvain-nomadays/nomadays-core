'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Building2, ChevronDown, ChevronRight, Bed, Users, Check, Moon, Minus, Plus, Coffee, UtensilsCrossed, Soup, Loader2, Trash2 } from 'lucide-react';
import { useUpdateBlock } from '@/hooks/useBlocks';
import { useCreateItem, useDeleteItem, useUpdateItem } from '@/hooks/useFormulaItems';
import { useAccommodation, useRoomRates } from '@/hooks/useAccommodations';
import { AccommodationSelectorDialog } from './AccommodationSelectorDialog';
import {
  resolveSeasonForDate,
  buildRateMap,
  getTripDayDate,
  formatRate,
} from '@/lib/seasonMatcher';
import type { Formula, Accommodation, RoomCategory, RoomRate, TripCondition } from '@/lib/api/types';

interface AccommodationBlockProps {
  block: Formula;
  tripId: number;
  dayId: number;
  dayNumber: number;
  locationHint?: string;
  tripStartDate?: string;
  onRefetch?: () => void;
  /** Delete the accommodation block */
  onDelete?: () => void;
  /** Auto-open the selector dialog on first render (used when creating a new block) */
  autoOpenSelector?: boolean;
  /** Condition option ID to set on items when creating/replacing (for variant blocks) */
  conditionOptionId?: number | null;
  /** Trip conditions — used for the "Ajouter variantes" button */
  tripConditions?: TripCondition[];
  /** Callback to convert this standalone block into a variant group */
  onConvertToVariants?: (conditionId: number) => void;
  /** Label of the active variant option (e.g. "Budget") — displayed next to HÉBERGEMENT */
  variantLabel?: string;
}

/**
 * Metadata stored in description_html (JSON).
 */
interface AccommodationMeta {
  accommodation_id?: number;
  selected_room_category_id?: number;
  nights?: number;
  breakfast_included?: boolean;
  lunch_included?: boolean;
  dinner_included?: boolean;
}

/**
 * Parse metadata stored in description_html (JSON with accommodation_id + selected_room_category_id + nights + breakfast).
 */
function parseAccommodationMeta(descriptionHtml?: string): AccommodationMeta | null {
  if (!descriptionHtml) return null;
  try {
    const parsed = JSON.parse(descriptionHtml);
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
  } catch {
    // Not JSON — legacy description_html
  }
  return null;
}

export function AccommodationBlock({
  block,
  tripId,
  dayId,
  dayNumber,
  locationHint,
  tripStartDate,
  onRefetch,
  onDelete,
  autoOpenSelector = false,
  conditionOptionId,
  tripConditions,
  onConvertToVariants,
  variantLabel,
}: AccommodationBlockProps) {
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [showOtherRooms, setShowOtherRooms] = useState(false);
  const autoOpenedRef = useRef(false);

  // Auto-open selector dialog on first render when autoOpenSelector is true
  useEffect(() => {
    if (autoOpenSelector && !autoOpenedRef.current) {
      autoOpenedRef.current = true;
      setSelectorOpen(true);
    }
  }, [autoOpenSelector]);

  const { mutate: updateBlock } = useUpdateBlock();
  const { mutate: createItem } = useCreateItem();
  const { mutate: deleteItem } = useDeleteItem();
  const { mutate: updateItem } = useUpdateItem();

  // Parse metadata from description_html
  const meta = useMemo(() => parseAccommodationMeta(block.description_html), [block.description_html]);

  // ─── Optimistic local state for nights & breakfast ─────────────────
  // These values update the UI instantly; API saves happen in the background.
  const [localNights, setLocalNights] = useState<number>(meta?.nights ?? 1);
  const [localBreakfast, setLocalBreakfast] = useState<boolean>(meta?.breakfast_included ?? true);
  const [localLunch, setLocalLunch] = useState<boolean>(meta?.lunch_included ?? false);
  const [localDinner, setLocalDinner] = useState<boolean>(meta?.dinner_included ?? false);
  const [saving, setSaving] = useState(false);

  // Sync local state when metadata changes from server (e.g. after hotel selection refetch)
  useEffect(() => {
    setLocalNights(meta?.nights ?? 1);
    setLocalBreakfast(meta?.breakfast_included ?? true);
    setLocalLunch(meta?.lunch_included ?? false);
    setLocalDinner(meta?.dinner_included ?? false);
  }, [meta?.nights, meta?.breakfast_included, meta?.lunch_included, meta?.dinner_included]);

  // Lazy-load full accommodation data (only when expanding other rooms)
  const { data: fullAccommodation, refetch: refetchAccommodation } = useAccommodation(
    showOtherRooms && meta?.accommodation_id ? meta.accommodation_id : null
  );

  // Fetch ALL rates for this accommodation (for rate display)
  const { data: allRates } = useRoomRates(
    meta?.accommodation_id ?? null
  );

  // Resolve the trip day date and matching season
  const dayDate = useMemo(
    () => getTripDayDate(tripStartDate, dayNumber),
    [tripStartDate, dayNumber]
  );

  // Build the rate map: room_category_id → best RoomRate
  const rateMap = useMemo(() => {
    if (!allRates?.length) return new Map();
    // Use seasons from fullAccommodation if loaded, otherwise no season resolution
    const seasons = fullAccommodation?.seasons || [];
    const seasonId = dayDate ? resolveSeasonForDate(seasons, dayDate) : null;
    return buildRateMap(allRates, seasonId);
  }, [allRates, fullAccommodation?.seasons, dayDate]);

  // Gather items
  const directItems = block.items || [];
  const selectedItem = directItems[0]; // Room item is the first (only) item
  const totalCost = directItems.reduce((sum, item) => sum + (item.unit_cost || 0), 0);

  // Other rooms (excluding selected one)
  const otherRooms = useMemo(() => {
    if (!fullAccommodation?.room_categories || !meta?.selected_room_category_id) return [];
    return fullAccommodation.room_categories
      .filter(rc => rc.is_active && rc.id !== meta.selected_room_category_id)
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [fullAccommodation, meta?.selected_room_category_id]);

  const hotelName = block.name || 'Hébergement non défini';

  // Handle hotel + room selection from the dialog
  const handleSelect = useCallback(async (selection: {
    accommodation: Accommodation;
    roomCategory: RoomCategory;
    resolvedRate?: RoomRate;
  }) => {
    const { accommodation, roomCategory, resolvedRate } = selection;

    try {
      // 1. Update the formula name and store accommodation metadata
      const starText = accommodation.star_rating
        ? ' ' + '★'.repeat(accommodation.star_rating)
        : '';

      // Pre-fill meals from meal_plan:
      // RO = Room Only, BB = Bed & Breakfast, HB = Half Board (B+D), FB = Full Board (B+L+D), AI = All Inclusive
      const mealPlan = resolvedRate?.meal_plan;
      const hasBreakfast = mealPlan ? mealPlan !== 'RO' : true;
      const hasLunch = mealPlan === 'FB' || mealPlan === 'AI';
      const hasDinner = mealPlan === 'HB' || mealPlan === 'FB' || mealPlan === 'AI';

      // Preserve existing nights count if available, default to 1
      const currentNights = localNights;

      // Optimistic: update local state immediately
      setLocalBreakfast(hasBreakfast);
      setLocalLunch(hasLunch);
      setLocalDinner(hasDinner);

      await updateBlock({
        formulaId: block.id,
        data: {
          name: `${accommodation.name}${starText}`,
          description_html: JSON.stringify({
            accommodation_id: accommodation.id,
            selected_room_category_id: roomCategory.id,
            nights: currentNights,
            breakfast_included: hasBreakfast,
            lunch_included: hasLunch,
            dinner_included: hasDinner,
          }),
        },
      });

      // 2. Delete existing items
      for (const item of directItems) {
        await deleteItem(item.id);
      }

      // 3. Resolve rate for the selected room
      // Use resolvedRate from dialog (fresh) or fallback to local rateMap (for quick-switch)
      const roomRate = resolvedRate ?? rateMap.get(roomCategory.id);
      const unitCost = roomRate?.cost ?? 0;
      const currency = roomRate?.currency ?? 'THB';

      // 4. Create the new room item with rate (times_value = number of nights)
      await createItem({
        formulaId: block.id,
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
          times_value: currentNights,
          sort_order: 0,
          seasons: [],
          condition_option_id: conditionOptionId ?? undefined,
        },
      });

      // 5. Refresh — needed here because hotel/room structure changed
      onRefetch?.();
    } catch (err) {
      console.error('Failed to update accommodation block:', err);
    }
  }, [block.id, directItems, localNights, updateBlock, deleteItem, createItem, onRefetch, rateMap, conditionOptionId]);

  // Quick-switch to another room (from the faded list)
  const handleSwitchRoom = useCallback(async (room: RoomCategory) => {
    if (!fullAccommodation) return;
    // Reuse the same select handler
    await handleSelect({
      accommodation: fullAccommodation,
      roomCategory: room,
    });
    setShowOtherRooms(false);
  }, [fullAccommodation, handleSelect]);

  // ─── Optimistic handlers: instant UI + background save ─────────────

  // Handle nights change (+/- buttons) — optimistic
  const handleNightsChange = useCallback(async (newNights: number) => {
    if (newNights < 1 || newNights > 15) return;

    // 1. Instant UI update
    setLocalNights(newNights);
    setSaving(true);

    try {
      // 2. Background save: update metadata + item times_value in parallel
      const updatedMeta: AccommodationMeta = { ...meta, nights: newNights };
      const promises: Promise<unknown>[] = [
        updateBlock({
          formulaId: block.id,
          data: { description_html: JSON.stringify(updatedMeta) },
        }),
      ];
      if (selectedItem) {
        promises.push(
          updateItem({
            itemId: selectedItem.id,
            data: { times_value: newNights },
          })
        );
      }
      await Promise.all(promises);
    } catch (err) {
      // Rollback on error
      setLocalNights(meta?.nights ?? 1);
      console.error('Failed to update nights:', err);
    } finally {
      setSaving(false);
    }
  }, [meta, block.id, selectedItem, updateBlock, updateItem]);

  // Handle breakfast toggle — optimistic
  const handleBreakfastToggle = useCallback(async (included: boolean) => {
    // 1. Instant UI update
    setLocalBreakfast(included);
    setSaving(true);

    try {
      // 2. Background save
      const updatedMeta: AccommodationMeta = { ...meta, breakfast_included: included };
      await updateBlock({
        formulaId: block.id,
        data: { description_html: JSON.stringify(updatedMeta) },
      });
    } catch (err) {
      // Rollback on error
      setLocalBreakfast(meta?.breakfast_included ?? true);
      console.error('Failed to toggle breakfast:', err);
    } finally {
      setSaving(false);
    }
  }, [meta, block.id, updateBlock]);

  // Handle meal toggle (lunch or dinner) — optimistic
  const handleMealToggle = useCallback(async (meal: 'lunch' | 'dinner', included: boolean) => {
    const setLocal = meal === 'lunch' ? setLocalLunch : setLocalDinner;
    const metaKey = meal === 'lunch' ? 'lunch_included' : 'dinner_included';
    const prevValue = meal === 'lunch' ? (meta?.lunch_included ?? false) : (meta?.dinner_included ?? false);

    setLocal(included);
    setSaving(true);

    try {
      const updatedMeta: AccommodationMeta = { ...meta, [metaKey]: included };
      await updateBlock({
        formulaId: block.id,
        data: { description_html: JSON.stringify(updatedMeta) },
      });
    } catch (err) {
      setLocal(prevValue);
      console.error(`Failed to toggle ${meal}:`, err);
    } finally {
      setSaving(false);
    }
  }, [meta, block.id, updateBlock]);

  const renderStars = (name: string) => {
    // Count trailing ★ in the name
    const starMatch = name.match(/★+$/);
    return starMatch ? (
      <span className="text-amber-400 ml-1">{starMatch[0]}</span>
    ) : null;
  };

  const cleanName = hotelName.replace(/★+$/, '').trim();

  return (
    <>
      <div className="rounded-lg border border-amber-200 bg-amber-50/30">
        {/* Header */}
        <div className="flex items-center gap-3 px-3 py-2.5">
          <Building2 className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-amber-600 uppercase tracking-wide">
                Hébergement
              </span>
              {variantLabel && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-sage-100 text-sage-700 text-[10px] font-semibold border border-sage-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-sage-500" />
                  {variantLabel}
                </span>
              )}
              {saving && (
                <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
              )}
            </div>
            <div className="text-sm font-semibold text-gray-800 truncate">
              {cleanName}
              {renderStars(hotelName)}
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => setSelectorOpen(true)}
              className="text-xs text-amber-600 hover:text-amber-800 font-medium px-2 py-1 rounded hover:bg-amber-100 transition-colors"
              title="Changer l'hébergement"
            >
              Changer
            </button>
            {/* "Add variants" button — only for standalone blocks (no condition yet) */}
            {!block.condition_id && onConvertToVariants && tripConditions && tripConditions.some(tc => tc.options && tc.options.length >= 2 && (tc.applies_to === 'accommodation' || tc.applies_to === 'all')) && meta?.accommodation_id && (
              <div className="relative group/variants">
                <button
                  className="text-gray-300 hover:text-amber-600 p-1 rounded hover:bg-amber-50 transition-colors"
                  title="Ajouter des variantes (Budget, Classique, Deluxe...)"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="7" width="20" height="14" rx="2" />
                    <rect x="4" y="3" width="16" height="4" rx="1" opacity="0.5" />
                  </svg>
                </button>
                {/* Dropdown to pick condition */}
                <div className="absolute right-0 top-full mt-1 hidden group-hover/variants:block z-20">
                  <div className="bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[180px]">
                    <div className="px-3 py-1.5 text-[10px] text-gray-400 uppercase tracking-wide font-medium">
                      Créer des variantes avec :
                    </div>
                    {tripConditions.filter(tc => tc.options && tc.options.length >= 2 && (tc.applies_to === 'accommodation' || tc.applies_to === 'all')).map((tc) => (
                      <button
                        key={tc.id}
                        onClick={() => onConvertToVariants(tc.condition_id)}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-amber-50 hover:text-amber-700 transition-colors"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-sage-500" />
                        {tc.condition_name}
                        <span className="ml-auto text-gray-400">({tc.options.length})</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {onDelete && (
              <button
                onClick={() => {
                  if (window.confirm('Supprimer ce bloc hébergement ?')) {
                    onDelete();
                  }
                }}
                className="text-gray-300 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors"
                title="Supprimer le bloc hébergement"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Multi-nights + Breakfast row */}
        {meta?.accommodation_id && (
          <div className="border-t border-amber-100 px-3 py-2 flex items-center gap-4 flex-wrap">
            {/* Nights counter */}
            <div className="flex items-center gap-1.5">
              <Moon className="w-3.5 h-3.5 text-amber-500" />
              <button
                type="button"
                onClick={() => handleNightsChange(localNights - 1)}
                disabled={localNights <= 1 || saving}
                className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:bg-amber-100 hover:text-amber-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="text-sm font-medium text-gray-700 min-w-[3rem] text-center">
                {localNights} nuit{localNights > 1 ? 's' : ''}
              </span>
              <button
                type="button"
                onClick={() => handleNightsChange(localNights + 1)}
                disabled={localNights >= 15 || saving}
                className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:bg-amber-100 hover:text-amber-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            {/* Meal checkboxes — Breakfast, Lunch, Dinner */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1 cursor-pointer select-none" title="Petit-déjeuner inclus">
                <input
                  type="checkbox"
                  checked={localBreakfast}
                  onChange={(e) => handleBreakfastToggle(e.target.checked)}
                  disabled={saving}
                  className="w-3.5 h-3.5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                />
                <Coffee className="w-3.5 h-3.5 text-amber-400" />
              </label>
              <label className="flex items-center gap-1 cursor-pointer select-none" title="Déjeuner inclus">
                <input
                  type="checkbox"
                  checked={localLunch}
                  onChange={(e) => handleMealToggle('lunch', e.target.checked)}
                  disabled={saving}
                  className="w-3.5 h-3.5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                />
                <UtensilsCrossed className="w-3.5 h-3.5 text-amber-400" />
              </label>
              <label className="flex items-center gap-1 cursor-pointer select-none" title="Dîner inclus">
                <input
                  type="checkbox"
                  checked={localDinner}
                  onChange={(e) => handleMealToggle('dinner', e.target.checked)}
                  disabled={saving}
                  className="w-3.5 h-3.5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                />
                <Soup className="w-3.5 h-3.5 text-amber-400" />
              </label>
            </div>
          </div>
        )}

        {/* Selected room item */}
        {selectedItem && (
          <div className="border-t border-amber-100 px-3 py-2 space-y-1">
            <div className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-800 flex-1 truncate">
                {selectedItem.name}
              </span>
              {totalCost > 0 && (
                <span className="text-xs font-medium text-amber-700">
                  {localNights > 1
                    ? `${(totalCost * localNights).toLocaleString('fr-FR')} ${selectedItem.currency || 'THB'} (${localNights}n × ${totalCost.toLocaleString('fr-FR')})`
                    : `${totalCost.toLocaleString('fr-FR')} ${selectedItem.currency || 'THB'}`
                  }
                </span>
              )}
            </div>
          </div>
        )}

        {/* Other items (if multiple) */}
        {directItems.length > 1 && (
          <div className="border-t border-amber-100 px-3 py-1.5 space-y-0.5">
            {directItems.slice(1).map((item) => (
              <div key={item.id} className="flex items-center gap-2 text-xs text-gray-600">
                <span className="flex-1 truncate">{item.name}</span>
                <span className="font-medium">
                  {item.unit_cost?.toLocaleString('fr-FR')} {item.currency || 'THB'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Other available rooms (collapsible, faded) */}
        {meta?.accommodation_id && (
          <div className="border-t border-amber-100">
            <button
              onClick={() => {
                setShowOtherRooms(!showOtherRooms);
                // Trigger lazy fetch on first expand
                if (!showOtherRooms && !fullAccommodation) {
                  refetchAccommodation();
                }
              }}
              className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showOtherRooms ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
              <span>
                {otherRooms.length > 0
                  ? `${otherRooms.length} autre${otherRooms.length > 1 ? 's' : ''} chambre${otherRooms.length > 1 ? 's' : ''} disponible${otherRooms.length > 1 ? 's' : ''}`
                  : 'Voir les autres chambres'
                }
              </span>
            </button>

            {showOtherRooms && (
              <div className="px-3 pb-2 space-y-0.5">
                {otherRooms.length > 0 ? (
                  otherRooms.map((room) => {
                    const roomRateText = formatRate(rateMap.get(room.id));
                    return (
                      <button
                        key={room.id}
                        onClick={() => handleSwitchRoom(room)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left opacity-50 hover:opacity-100 hover:bg-amber-50 transition-all"
                      >
                        <Bed className="w-3 h-3 text-amber-400 flex-shrink-0" />
                        <span className="text-xs text-gray-600 flex-1 truncate">
                          {room.name}
                        </span>
                        {roomRateText && (
                          <span className="text-xs text-gray-400 font-medium flex-shrink-0">
                            {roomRateText}
                          </span>
                        )}
                        <span className="flex items-center gap-1.5 text-xs text-gray-400">
                          <Users className="w-2.5 h-2.5" />
                          {room.max_occupancy}
                        </span>
                        {room.size_sqm && (
                          <span className="text-xs text-gray-300">{room.size_sqm}m²</span>
                        )}
                      </button>
                    );
                  })
                ) : (
                  <div className="text-xs text-gray-300 py-1 px-2">
                    Chargement...
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hotel selector dialog */}
      <AccommodationSelectorDialog
        open={selectorOpen}
        onOpenChange={setSelectorOpen}
        locationHint={locationHint}
        currentHotelName={cleanName}
        tripStartDate={tripStartDate}
        dayNumber={dayNumber}
        onSelect={handleSelect}
      />
    </>
  );
}
