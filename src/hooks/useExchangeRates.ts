'use client';

import { useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import { useApi, useMutation } from './useApi';
import type { ExchangeRateEntry } from '@/lib/api/types';

interface TripRatesResponse {
  trip_id: number;
  base_currency: string;
  rates: Record<string, ExchangeRateEntry>;
  missing_currencies: string[];
}

/**
 * Hook to fetch exchange rates for a trip
 */
export function useTripRates(tripId: number | null) {
  const fetcher = useCallback(async () => {
    if (!tripId) throw new Error('Trip ID is required');
    return apiClient.get<TripRatesResponse>(`/exchange-rates/trips/${tripId}`);
  }, [tripId]);

  return useApi(fetcher, { immediate: !!tripId });
}

/**
 * Hook to set a single manual exchange rate
 */
export function useSetManualRate() {
  const mutationFn = useCallback(async ({
    tripId,
    fromCurrency,
    rate,
  }: {
    tripId: number;
    fromCurrency: string;
    rate: number;
  }) => {
    return apiClient.post<TripRatesResponse>(`/exchange-rates/trips/${tripId}/manual`, {
      from_currency: fromCurrency,
      rate,
    });
  }, []);

  return useMutation(mutationFn);
}

/**
 * Hook to set multiple manual rates at once
 */
export function useSetManualRatesBatch() {
  const mutationFn = useCallback(async ({
    tripId,
    rates,
  }: {
    tripId: number;
    rates: Record<string, number>;
  }) => {
    return apiClient.post<TripRatesResponse>(`/exchange-rates/trips/${tripId}/manual-batch`, {
      rates,
    });
  }, []);

  return useMutation(mutationFn);
}

/**
 * Hook to lock rates for a trip
 */
export function useLockRates() {
  const mutationFn = useCallback(async ({
    tripId,
    lockAll = true,
    currencies,
  }: {
    tripId: number;
    lockAll?: boolean;
    currencies?: string[];
  }) => {
    return apiClient.post<TripRatesResponse>(`/exchange-rates/trips/${tripId}/lock`, {
      lock_all: lockAll,
      currencies,
    });
  }, []);

  return useMutation(mutationFn);
}

/**
 * Hook to delete a rate
 */
export function useDeleteRate() {
  const mutationFn = useCallback(async ({
    tripId,
    currency,
  }: {
    tripId: number;
    currency: string;
  }) => {
    return apiClient.delete<TripRatesResponse>(`/exchange-rates/trips/${tripId}/${currency}`);
  }, []);

  return useMutation(mutationFn);
}

/**
 * Hook to fetch Kantox rates (when available)
 */
export function useFetchKantoxRates() {
  const mutationFn = useCallback(async ({
    tripId,
    currencies,
  }: {
    tripId: number;
    currencies: string[];
  }) => {
    const params = currencies.map(c => `currencies=${c}`).join('&');
    return apiClient.post<TripRatesResponse>(
      `/exchange-rates/trips/${tripId}/fetch-kantox?${params}`,
      {}
    );
  }, []);

  return useMutation(mutationFn);
}
