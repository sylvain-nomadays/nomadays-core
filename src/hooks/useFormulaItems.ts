'use client';

import { useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import { useMutation } from './useApi';

// ============================================================================
// Item CRUD Hooks for the quotation engine
// ============================================================================

interface CreateItemData {
  name: string;
  cost_nature_id?: number | null;
  supplier_id?: number | null;
  rate_catalog_id?: number | null;
  contract_rate_id?: number | null;
  currency?: string;
  unit_cost?: number;
  pricing_method?: string;
  pricing_value?: number | null;
  ratio_categories?: string;
  ratio_per?: number;
  ratio_type?: string;
  times_type?: string;
  times_value?: number;
  condition_option_id?: number | null;
  sort_order?: number;
  seasons?: Array<{
    season_name: string;
    valid_from?: string;
    valid_to?: string;
    cost_multiplier?: number;
    cost_override?: number;
  }>;
}

interface UpdateItemData {
  name?: string;
  cost_nature_id?: number | null;
  supplier_id?: number | null;
  rate_catalog_id?: number | null;
  contract_rate_id?: number | null;
  currency?: string;
  unit_cost?: number;
  pricing_method?: string;
  pricing_value?: number | null;
  ratio_categories?: string;
  ratio_per?: number;
  ratio_type?: string;
  times_type?: string;
  times_value?: number;
  condition_option_id?: number | null;
  sort_order?: number;
  payment_flow?: string;
  price_includes_vat?: boolean;
  tier_categories?: string;
  price_tiers?: Array<{
    pax_min: number;
    pax_max: number;
    unit_cost: number;
    category_adjustments_json?: Record<string, number>;
    sort_order?: number;
  }>;
}

interface ItemResponse {
  id: number;
  formula_id: number;
  name: string;
  cost_nature_id: number | null;
  cost_nature_code?: string | null;
  supplier_id: number | null;
  rate_catalog_id: number | null;
  contract_rate_id: number | null;
  currency: string;
  unit_cost: number;
  pricing_method: string;
  pricing_value: number | null;
  ratio_categories: string;
  ratio_per: number;
  ratio_type: string;
  times_type: string;
  times_value: number;
  condition_option_id: number | null;
  sort_order: number;
}

/**
 * Hook to create an item in a formula.
 * POST /trip-structure/formulas/{formulaId}/items
 */
export function useCreateItem() {
  const mutationFn = useCallback(
    async ({ formulaId, data }: { formulaId: number; data: CreateItemData }) => {
      return apiClient.post<ItemResponse>(
        `/trip-structure/formulas/${formulaId}/items`,
        { ...data, seasons: data.seasons || [] }
      );
    },
    []
  );

  return useMutation(mutationFn);
}

/**
 * Hook to update an existing item.
 * PATCH /trip-structure/items/{itemId}
 */
export function useUpdateItem() {
  const mutationFn = useCallback(
    async ({ itemId, data }: { itemId: number; data: UpdateItemData }) => {
      return apiClient.patch<ItemResponse>(
        `/trip-structure/items/${itemId}`,
        data
      );
    },
    []
  );

  return useMutation(mutationFn);
}

/**
 * Hook to delete an item.
 * DELETE /trip-structure/items/{itemId}
 */
export function useDeleteItem() {
  const mutationFn = useCallback(async (itemId: number) => {
    return apiClient.delete<void>(`/trip-structure/items/${itemId}`);
  }, []);

  return useMutation(mutationFn);
}

/**
 * Helper: delete all items in a formula, then create a new one.
 * Used by AccommodationBlock when changing room selection.
 */
export function useReplaceFormulaItems() {
  const { mutate: createItem } = useCreateItem();
  const { mutate: deleteItem } = useDeleteItem();

  const replaceItems = useCallback(
    async ({
      formulaId,
      existingItemIds,
      newItem,
    }: {
      formulaId: number;
      existingItemIds: number[];
      newItem: CreateItemData;
    }) => {
      // Delete existing items
      for (const itemId of existingItemIds) {
        await deleteItem(itemId);
      }
      // Create the new item
      return createItem({ formulaId, data: newItem });
    },
    [createItem, deleteItem]
  );

  return { replaceItems };
}
