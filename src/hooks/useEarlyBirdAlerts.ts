'use client';

import { useCallback, useMemo, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import type { Item, Accommodation, EarlyBirdDiscount } from '@/lib/api/types';

// ============================================================================
// Types
// ============================================================================

interface AccommodationWithDiscounts {
  accommodation: Accommodation;
  discounts: EarlyBirdDiscount[];
}

interface UseEarlyBirdAlertsResult {
  accommodations: Map<number, AccommodationWithDiscounts>;
  loading: boolean;
  error: Error | null;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to fetch accommodations and their Early Bird discounts for circuit items
 *
 * @param items - The items (prestations) of the circuit
 * @returns A map of supplier_id -> { accommodation, discounts }
 */
export function useEarlyBirdAlerts(items: Item[]): UseEarlyBirdAlertsResult {
  const [accommodations, setAccommodations] = useState<Map<number, AccommodationWithDiscounts>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Extract unique supplier IDs from items
  const supplierIds = useMemo(() => {
    const ids = new Set<number>();
    for (const item of items) {
      if (item.supplier_id) {
        ids.add(item.supplier_id);
      }
    }
    return Array.from(ids);
  }, [items]);

  // Fetch accommodation data for each supplier
  useEffect(() => {
    if (supplierIds.length === 0) {
      setAccommodations(new Map());
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      const newAccommodations = new Map<number, AccommodationWithDiscounts>();

      try {
        // Fetch accommodation for each supplier in parallel
        const results = await Promise.allSettled(
          supplierIds.map(async (supplierId) => {
            try {
              // Get accommodation by supplier
              const accommodation = await apiClient.get<Accommodation>(
                `/suppliers/${supplierId}/accommodation`
              );

              // Get early bird discounts for this accommodation
              const discounts = await apiClient.get<EarlyBirdDiscount[]>(
                `/accommodations/${accommodation.id}/early-bird`
              );

              return { supplierId, accommodation, discounts };
            } catch (err) {
              // Supplier might not be an accommodation type, skip silently
              return null;
            }
          })
        );

        // Process results
        for (const result of results) {
          if (result.status === 'fulfilled' && result.value) {
            const { supplierId, accommodation, discounts } = result.value;
            newAccommodations.set(supplierId, { accommodation, discounts });
          }
        }

        setAccommodations(newAccommodations);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch accommodation data'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [supplierIds]);

  return { accommodations, loading, error };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate days remaining until trip start
 */
export function calculateDaysUntilTrip(tripStartDate: string, fromDate?: string): number {
  const from = fromDate ? new Date(fromDate) : new Date();
  const start = new Date(tripStartDate);

  from.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);

  const diffMs = start.getTime() - from.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Check if any Early Bird discount is at risk
 */
export function hasEarlyBirdAtRisk(
  tripStartDate: string,
  accommodations: Map<number, AccommodationWithDiscounts>,
  proposalDate?: string
): boolean {
  const daysRemaining = calculateDaysUntilTrip(tripStartDate, proposalDate);

  for (const [, { discounts }] of accommodations) {
    for (const discount of discounts) {
      if (!discount.is_active) continue;

      // At risk if less than 30 days margin
      const margin = daysRemaining - discount.days_in_advance;
      if (margin <= 30) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Get summary of Early Bird status
 */
export function getEarlyBirdSummary(
  tripStartDate: string,
  accommodations: Map<number, AccommodationWithDiscounts>,
  proposalDate?: string
): { expired: number; warning: number; active: number; totalSavings: number } {
  const daysRemaining = calculateDaysUntilTrip(tripStartDate, proposalDate);
  const summary = { expired: 0, warning: 0, active: 0, totalSavings: 0 };

  for (const [, { discounts }] of accommodations) {
    for (const discount of discounts) {
      if (!discount.is_active) continue;

      const margin = daysRemaining - discount.days_in_advance;

      if (margin < 0) {
        summary.expired++;
      } else if (margin <= 30) {
        summary.warning++;
        summary.totalSavings += discount.discount_percent;
      } else {
        summary.active++;
        summary.totalSavings += discount.discount_percent;
      }
    }
  }

  return summary;
}
