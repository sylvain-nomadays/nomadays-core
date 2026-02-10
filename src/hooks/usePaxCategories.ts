'use client';

import { useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import { useApi, useMutation } from './useApi';
import type { PaxCategory } from '@/lib/api/types';

/**
 * Hook to manage PAX categories at the tenant level.
 * Used in Configuration page to create/edit/delete pax categories.
 */
export function usePaxCategories() {
  const fetcher = useCallback(async () => {
    return apiClient.get<PaxCategory[]>('/pax-categories');
  }, []);

  const result = useApi(fetcher, { immediate: true, deps: [] });

  // Create a custom pax category
  const createMutation = useMutation(
    async (data: {
      code: string;
      label: string;
      group_type?: string;
      age_min?: number | null;
      age_max?: number | null;
      counts_for_pricing?: boolean;
      sort_order?: number;
    }) => {
      return apiClient.post<PaxCategory>('/pax-categories', data);
    }
  );

  // Update a pax category
  const updateMutation = useMutation(
    async ({ categoryId, data }: {
      categoryId: number;
      data: {
        label?: string;
        group_type?: string;
        age_min?: number | null;
        age_max?: number | null;
        counts_for_pricing?: boolean;
        is_active?: boolean;
        sort_order?: number;
      };
    }) => {
      return apiClient.patch<PaxCategory>(`/pax-categories/${categoryId}`, data);
    }
  );

  // Delete a custom pax category
  const deleteMutation = useMutation(
    async (categoryId: number) => {
      return apiClient.delete(`/pax-categories/${categoryId}`);
    }
  );

  // Seed default categories
  const seedMutation = useMutation(
    async (_?: unknown) => {
      return apiClient.post<PaxCategory[]>('/pax-categories/seed', {});
    }
  );

  return {
    ...result,
    createCategory: createMutation.mutate,
    updateCategory: updateMutation.mutate,
    deleteCategory: deleteMutation.mutate,
    seedCategories: seedMutation.mutate,
    isCreating: createMutation.loading,
    isUpdating: updateMutation.loading,
    isDeleting: deleteMutation.loading,
    isSeeding: seedMutation.loading,
  };
}
