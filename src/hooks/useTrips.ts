'use client';

import { useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import { useApi, useMutation } from './useApi';
import type { Trip, CreateTripDTO, UpdateTripDTO, PaginatedResponse, QuotationResult } from '@/lib/api/types';

interface TripsFilters {
  type?: string;
  status?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

/**
 * Hook to fetch trips list
 */
export function useTrips(filters: TripsFilters = {}) {
  const fetcher = useCallback(async () => {
    const params = new URLSearchParams();
    if (filters.type) params.append('type', filters.type);
    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', String(filters.page));
    if (filters.page_size) params.append('page_size', String(filters.page_size));

    const query = params.toString();
    const endpoint = `/trips${query ? `?${query}` : ''}`;
    return apiClient.get<PaginatedResponse<Trip>>(endpoint);
  }, [filters.type, filters.status, filters.search, filters.page, filters.page_size]);

  return useApi(fetcher);
}

/**
 * Hook to fetch a single trip
 */
export function useTrip(id: number | string | null) {
  const fetcher = useCallback(async () => {
    if (!id) throw new Error('Trip ID is required');
    return apiClient.get<Trip>(`/trips/${id}`);
  }, [id]);

  return useApi(fetcher, { immediate: !!id });
}

/**
 * Hook to create a trip
 */
export function useCreateTrip() {
  const mutationFn = useCallback(async (data: CreateTripDTO) => {
    return apiClient.post<Trip>('/trips', data);
  }, []);

  return useMutation(mutationFn);
}

/**
 * Hook to update a trip
 */
export function useUpdateTrip() {
  const mutationFn = useCallback(async ({ id, data }: { id: number; data: UpdateTripDTO }) => {
    return apiClient.patch<Trip>(`/trips/${id}`, data);
  }, []);

  return useMutation(mutationFn);
}

/**
 * Hook to delete a trip
 */
export function useDeleteTrip() {
  const mutationFn = useCallback(async (id: number) => {
    return apiClient.delete<void>(`/trips/${id}`);
  }, []);

  return useMutation(mutationFn);
}

/**
 * Hook to duplicate a trip
 */
export function useDuplicateTrip() {
  const mutationFn = useCallback(async (id: number) => {
    return apiClient.post<Trip>(`/trips/${id}/duplicate`);
  }, []);

  return useMutation(mutationFn);
}

/**
 * Hook to calculate quotation for a trip
 */
export function useCalculateQuotation() {
  const mutationFn = useCallback(async (tripId: number) => {
    return apiClient.post<QuotationResult>(`/quotation/calculate/${tripId}`);
  }, []);

  return useMutation(mutationFn);
}
