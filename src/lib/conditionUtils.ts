/**
 * Condition utilities — shared logic for condition-based filtering.
 * Used by TransversalServicesPanel, AccommodationVariantGroup, DayBlockList, etc.
 */

import type { Formula, Item, TripCondition } from '@/lib/api/types';

/**
 * Determines whether an item should be included in totals based on the
 * formula's condition and the trip's selected condition option.
 * Mirrors the backend QuotationEngine.should_include_item() logic.
 */
export function shouldIncludeItem(
  item: Item,
  formula: Formula,
  tripConditions?: TripCondition[],
): boolean {
  // 1. Formula without condition → all items unconditional
  if (!formula.condition_id) return true;
  // 2. Item without condition_option_id → common cost, always included
  if (!item.condition_option_id) return true;
  // 3. Both set: check against trip's selected option
  if (!tripConditions) return true;
  const tc = tripConditions.find(c => c.condition_id === formula.condition_id);
  // No trip condition activated for this → include all by default
  if (!tc) return true;
  // Condition disabled → include all
  if (!tc.is_active) return true;
  // No option selected yet → exclude conditioned items (force a choice)
  if (!tc.selected_option_id) return false;
  // Match: include only if item's option matches trip's selected option
  return item.condition_option_id === tc.selected_option_id;
}

/**
 * Finds the active variant (Formula) in a group of accommodation blocks
 * sharing the same condition_id, based on the trip's selected condition option.
 *
 * Returns the variant whose item's condition_option_id matches the selected option,
 * or the first variant if no match is found.
 */
export function findActiveVariant(
  variants: Formula[],
  conditionId: number,
  tripConditions?: TripCondition[],
): Formula | undefined {
  if (!variants.length) return undefined;
  if (!tripConditions) return variants[0];

  const tc = tripConditions.find(c => c.condition_id === conditionId);
  if (!tc || !tc.is_active || !tc.selected_option_id) return variants[0];

  // Find the variant whose item has the matching condition_option_id
  const match = variants.find(v =>
    (v.items || []).some(item => item.condition_option_id === tc.selected_option_id)
  );

  return match || variants[0];
}

/**
 * Gets the condition option label for an accommodation variant's item.
 */
export function getVariantOptionLabel(
  variant: Formula,
  tripConditions?: TripCondition[],
  conditionId?: number | null,
): string | null {
  if (!conditionId || !tripConditions) return null;

  const tc = tripConditions.find(c => c.condition_id === conditionId);
  if (!tc) return null;

  const item = (variant.items || [])[0];
  if (!item?.condition_option_id) return null;

  const option = (tc.options || []).find(o => o.id === item.condition_option_id);
  return option?.label || null;
}
