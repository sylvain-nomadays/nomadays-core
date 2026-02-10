'use client';

import { useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import { useApi, useMutation } from './useApi';
import type { Condition, ConditionOption, TripCondition } from '@/lib/api/types';

// ─────────────────────────────────────────────────────────────────────────────
// Tenant-level conditions CRUD (global conditions with options)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook to manage global conditions at the tenant level.
 * Used in Settings page to create/edit/delete conditions and their options.
 */
export function useTenantConditions() {
  const fetcher = useCallback(async () => {
    return apiClient.get<Condition[]>('/conditions');
  }, []);

  const result = useApi(fetcher, { immediate: true, deps: [] });

  // Create condition with initial options
  const createMutation = useMutation(
    async (data: { name: string; description?: string; applies_to?: string; options?: { label: string }[] }) => {
      return apiClient.post<Condition>('/conditions', data);
    }
  );

  // Update condition name/description/applies_to
  const updateMutation = useMutation(
    async ({ conditionId, data }: {
      conditionId: number;
      data: { name?: string; description?: string; applies_to?: string };
    }) => {
      return apiClient.patch<Condition>(`/conditions/${conditionId}`, data);
    }
  );

  // Delete condition
  const deleteMutation = useMutation(
    async (conditionId: number) => {
      return apiClient.delete(`/conditions/${conditionId}`);
    }
  );

  // Add option to a condition
  const addOptionMutation = useMutation(
    async ({ conditionId, data }: {
      conditionId: number;
      data: { label: string; sort_order?: number };
    }) => {
      return apiClient.post<ConditionOption>(
        `/conditions/${conditionId}/options`,
        data
      );
    }
  );

  // Update an option
  const updateOptionMutation = useMutation(
    async ({ conditionId, optionId, data }: {
      conditionId: number;
      optionId: number;
      data: { label?: string; sort_order?: number };
    }) => {
      return apiClient.patch<ConditionOption>(
        `/conditions/${conditionId}/options/${optionId}`,
        data
      );
    }
  );

  // Delete an option
  const deleteOptionMutation = useMutation(
    async ({ conditionId, optionId }: { conditionId: number; optionId: number }) => {
      return apiClient.delete(`/conditions/${conditionId}/options/${optionId}`);
    }
  );

  return {
    conditions: result.data || [],
    isLoading: result.loading,
    error: result.error,
    refetch: result.refetch,
    // Condition CRUD
    create: createMutation.mutate,
    creating: createMutation.loading,
    update: updateMutation.mutate,
    updating: updateMutation.loading,
    remove: deleteMutation.mutate,
    removing: deleteMutation.loading,
    // Option CRUD
    addOption: addOptionMutation.mutate,
    addingOption: addOptionMutation.loading,
    updateOption: updateOptionMutation.mutate,
    updatingOption: updateOptionMutation.loading,
    deleteOption: deleteOptionMutation.mutate,
    deletingOption: deleteOptionMutation.loading,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Trip-level conditions (activation + option selection per circuit)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook to manage conditions at the trip/circuit level.
 * Allows activating conditions, selecting options, and toggling on/off.
 */
export function useTripConditions(tripId: number | undefined, refreshKey?: number) {
  const fetcher = useCallback(async () => {
    if (!tripId) return [];
    return apiClient.get<TripCondition[]>(`/trip-structure/trips/${tripId}/conditions`);
  }, [tripId]);

  const result = useApi(fetcher, { immediate: !!tripId, deps: [tripId, refreshKey] });

  // Activate a condition on this trip
  const activateMutation = useMutation(
    async (data: { condition_id: number; selected_option_id?: number }) => {
      if (!tripId) throw new Error('No trip ID');
      return apiClient.post<TripCondition>(
        `/trip-structure/trips/${tripId}/conditions`,
        data
      );
    }
  );

  // Update: toggle is_active or change selected_option_id
  const updateMutation = useMutation(
    async ({ tripConditionId, data }: {
      tripConditionId: number;
      data: {
        is_active?: boolean;
        selected_option_id?: number | null;
      };
    }) => {
      if (!tripId) throw new Error('No trip ID');
      return apiClient.patch<TripCondition>(
        `/trip-structure/trips/${tripId}/conditions/${tripConditionId}`,
        data
      );
    }
  );

  // Deactivate (remove) a condition from this trip
  const deactivateMutation = useMutation(
    async (tripConditionId: number) => {
      if (!tripId) throw new Error('No trip ID');
      return apiClient.delete(
        `/trip-structure/trips/${tripId}/conditions/${tripConditionId}`
      );
    }
  );

  return {
    tripConditions: result.data || [],
    isLoading: result.loading,
    error: result.error,
    refetch: result.refetch,
    activate: activateMutation.mutate,
    activating: activateMutation.loading,
    update: updateMutation.mutate,
    updating: updateMutation.loading,
    deactivate: deactivateMutation.mutate,
    deactivating: deactivateMutation.loading,
  };
}
