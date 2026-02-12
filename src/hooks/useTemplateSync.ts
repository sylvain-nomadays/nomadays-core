'use client';

import { useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import { useApi, useMutation } from './useApi';
import type { FormulaResponse } from '@/lib/api/types';

// ─────────────────────────────────────────────────────────────────────────────
// Template Sync Hook — sync detection & push/pull/unlink
// ─────────────────────────────────────────────────────────────────────────────

// ─── Types ───────────────────────────────────────────────────────────────────

export type SyncStatus = 'no_template' | 'in_sync' | 'template_updated';

export interface TemplateSyncItem {
  formula_id: number;
  formula_name: string;
  block_type: string;
  day_number?: number | null;
  template_source_id: number;
  source_version?: number | null;
  template_version: number;
  status: 'in_sync' | 'template_updated';
}

export interface TripTemplateSyncResponse {
  trip_id: number;
  total_linked: number;
  out_of_sync: number;
  items: TemplateSyncItem[];
}

// ─── Block Sync Status ──────────────────────────────────────────────────────

/**
 * Determine sync status from a formula's template fields.
 * No API call — computed from already-loaded data.
 */
export function getBlockSyncStatus(formula: {
  template_source_id?: number | null;
  template_source_version?: number | null;
  template_version?: number;
  is_template?: boolean;
}): SyncStatus {
  if (!formula.template_source_id || formula.is_template) {
    return 'no_template';
  }
  const sourceVersion = formula.template_source_version ?? 0;
  const templateVersion = formula.template_version ?? 1;
  return sourceVersion >= templateVersion ? 'in_sync' : 'template_updated';
}

// ─── Trip Sync Status Hook ──────────────────────────────────────────────────

/**
 * Hook to fetch sync status for all template-linked blocks in a trip.
 */
export function useTripSyncStatus(tripId: number | undefined) {
  const fetcher = useCallback(async () => {
    if (!tripId) return null;
    return apiClient.get<TripTemplateSyncResponse>(`/trips/${tripId}/template-sync-status`);
  }, [tripId]);

  const result = useApi(fetcher, { immediate: !!tripId, deps: [tripId] });

  return {
    syncStatus: result.data,
    isLoading: result.loading,
    error: result.error,
    refetch: result.refetch,
  };
}

// ─── Push / Pull / Unlink Mutations ─────────────────────────────────────────

/**
 * Hook providing push/pull/unlink mutations for template sync.
 */
export function useTemplateSyncActions() {
  // Push local changes to template
  const pushMutation = useMutation(
    async (formulaId: number) => {
      return apiClient.post<FormulaResponse>(
        `/trip-structure/formulas/${formulaId}/push-to-template`,
        {}
      );
    }
  );

  // Pull template changes to local formula
  const pullMutation = useMutation(
    async (formulaId: number) => {
      return apiClient.post<FormulaResponse>(
        `/trip-structure/formulas/${formulaId}/pull-from-template`,
        {}
      );
    }
  );

  // Unlink formula from template
  const unlinkMutation = useMutation(
    async (formulaId: number) => {
      return apiClient.post<FormulaResponse>(
        `/trip-structure/formulas/${formulaId}/unlink-template`,
        {}
      );
    }
  );

  return {
    push: pushMutation.mutate,
    pushing: pushMutation.loading,
    pull: pullMutation.mutate,
    pulling: pullMutation.loading,
    unlink: unlinkMutation.mutate,
    unlinking: unlinkMutation.loading,
  };
}
