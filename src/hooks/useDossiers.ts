'use client';

import { useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import { useApi, useMutation } from './useApi';
import type {
  Dossier,
  CreateDossierDTO,
  UpdateDossierDTO,
  PaginatedResponse,
} from '@/lib/api/types';

interface DossiersFilters {
  status?: string;
  is_hot?: boolean;
  assigned_to_id?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

interface DossierStats {
  by_status: Record<string, number>;
  hot_leads: number;
  total_active: number;
}

/**
 * Hook to fetch dossiers list
 */
export function useDossiers(filters: DossiersFilters = {}) {
  const fetcher = useCallback(async () => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.is_hot !== undefined) params.append('is_hot', String(filters.is_hot));
    if (filters.assigned_to_id) params.append('assigned_to_id', filters.assigned_to_id);
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', String(filters.page));
    if (filters.page_size) params.append('page_size', String(filters.page_size));

    const query = params.toString();
    const endpoint = `/dossiers${query ? `?${query}` : ''}`;
    return apiClient.get<PaginatedResponse<Dossier>>(endpoint);
  }, [filters.status, filters.is_hot, filters.assigned_to_id, filters.search, filters.page, filters.page_size]);

  const result = useApi(fetcher);

  return {
    dossiers: result.data?.items || [],
    total: result.data?.total || 0,
    page: result.data?.page || 1,
    pageSize: result.data?.page_size || 20,
    isLoading: result.loading,
    error: result.error,
    refetch: result.refetch,
  };
}

/**
 * Hook to fetch a single dossier
 */
export function useDossier(id: string | null) {
  const fetcher = useCallback(async () => {
    if (!id) throw new Error('Dossier ID is required');
    return apiClient.get<Dossier>(`/dossiers/${id}`);
  }, [id]);

  return useApi(fetcher, { immediate: !!id });
}

/**
 * Hook to create a dossier
 */
export function useCreateDossier() {
  const mutationFn = useCallback(async (data: CreateDossierDTO) => {
    return apiClient.post<Dossier>('/dossiers', data);
  }, []);

  return useMutation(mutationFn);
}

/**
 * Hook to update a dossier
 */
export function useUpdateDossier() {
  const mutationFn = useCallback(async ({ id, data }: { id: string; data: UpdateDossierDTO }) => {
    return apiClient.patch<Dossier>(`/dossiers/${id}`, data);
  }, []);

  return useMutation(mutationFn);
}

/**
 * Hook to delete a dossier
 */
export function useDeleteDossier() {
  const mutationFn = useCallback(async (id: string) => {
    return apiClient.delete<void>(`/dossiers/${id}`);
  }, []);

  return useMutation(mutationFn);
}

/**
 * Hook to mark dossier as lost
 */
export function useMarkDossierLost() {
  const mutationFn = useCallback(async ({
    id,
    reason,
    comment,
  }: {
    id: string;
    reason?: string;
    comment?: string;
  }) => {
    const params = new URLSearchParams();
    if (reason) params.append('reason', reason);
    if (comment) params.append('comment', comment);
    const query = params.toString();
    return apiClient.post<Dossier>(`/dossiers/${id}/mark-lost${query ? `?${query}` : ''}`, {});
  }, []);

  return useMutation(mutationFn);
}

/**
 * Hook to fetch dossier statistics
 */
export function useDossierStats() {
  const fetcher = useCallback(async () => {
    return apiClient.get<DossierStats>('/dossiers/stats/summary');
  }, []);

  return useApi(fetcher);
}
