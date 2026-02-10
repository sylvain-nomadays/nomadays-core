'use client';

import { useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import { useApi } from './useApi';
import type { CostNature } from '@/lib/api/types';

interface CostNatureListResponse {
  items: CostNature[];
  total: number;
}

/**
 * Default cost nature categories — fallback when API is not yet seeded.
 * These are pure categories (what is being bought), NOT payment flows.
 * Payment flow is now a separate field on Item.
 */
export const DEFAULT_COST_NATURES: CostNature[] = [
  { id: -1, code: 'HTL', label: 'Hébergement',        generates_booking: false, generates_purchase_order: false, generates_payroll: false, generates_advance: false },
  { id: -2, code: 'TRS', label: 'Transport',           generates_booking: false, generates_purchase_order: false, generates_payroll: false, generates_advance: false },
  { id: -3, code: 'ACT', label: 'Activité/Excursion',  generates_booking: false, generates_purchase_order: false, generates_payroll: false, generates_advance: false },
  { id: -4, code: 'GDE', label: 'Équipe',               generates_booking: false, generates_purchase_order: false, generates_payroll: false, generates_advance: false },
  { id: -5, code: 'RES', label: 'Restauration',        generates_booking: false, generates_purchase_order: false, generates_payroll: false, generates_advance: false },
  { id: -6, code: 'MIS', label: 'Divers',              generates_booking: false, generates_purchase_order: false, generates_payroll: false, generates_advance: false },
];

/**
 * Hook to fetch cost nature categories.
 * Falls back to DEFAULT_COST_NATURES when API returns nothing.
 */
export function useCostNatures() {
  const fetcher = useCallback(async () => {
    return apiClient.get<CostNatureListResponse>('/cost-natures');
  }, []);

  const result = useApi(fetcher);

  const costNatures = (result.data?.items && result.data.items.length > 0)
    ? result.data.items
    : DEFAULT_COST_NATURES;

  return {
    costNatures,
    isLoading: result.loading,
    error: result.error,
    refetch: result.refetch,
  };
}
