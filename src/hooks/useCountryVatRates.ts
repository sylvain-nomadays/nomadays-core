'use client';

import { useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import { useApi, useMutation } from './useApi';
import type { CountryVatRate } from '@/lib/api/types';

/**
 * Hook to manage country VAT rates at the tenant level.
 * Used in Configuration page to create/edit/delete VAT rates per country.
 */
export function useCountryVatRates() {
  const fetcher = useCallback(async () => {
    return apiClient.get<CountryVatRate[]>('/country-vat-rates');
  }, []);

  const result = useApi(fetcher, { immediate: true, deps: [] });

  // Create a VAT rate entry
  const createMutation = useMutation(
    async (data: {
      country_code: string;
      country_name?: string;
      vat_rate_standard: number;
      vat_rate_hotel?: number | null;
      vat_rate_restaurant?: number | null;
      vat_rate_transport?: number | null;
      vat_rate_activity?: number | null;
      is_active?: boolean;
    }) => {
      return apiClient.post<CountryVatRate>('/country-vat-rates', data);
    }
  );

  // Update a VAT rate entry
  const updateMutation = useMutation(
    async ({ rateId, data }: {
      rateId: number;
      data: {
        country_name?: string;
        vat_rate_standard?: number;
        vat_rate_hotel?: number | null;
        vat_rate_restaurant?: number | null;
        vat_rate_transport?: number | null;
        vat_rate_activity?: number | null;
        vat_calculation_mode?: 'on_margin' | 'on_selling_price';
        is_active?: boolean;
      };
    }) => {
      return apiClient.patch<CountryVatRate>(`/country-vat-rates/${rateId}`, data);
    }
  );

  // Delete a VAT rate entry
  const deleteMutation = useMutation(
    async (rateId: number) => {
      return apiClient.delete(`/country-vat-rates/${rateId}`);
    }
  );

  // Seed default VAT rates
  const seedMutation = useMutation(
    async (_?: unknown) => {
      return apiClient.post<CountryVatRate[]>('/country-vat-rates/seed', {});
    }
  );

  return {
    ...result,
    createRate: createMutation.mutate,
    updateRate: updateMutation.mutate,
    deleteRate: deleteMutation.mutate,
    seedRates: seedMutation.mutate,
    isCreating: createMutation.loading,
    isUpdating: updateMutation.loading,
    isDeleting: deleteMutation.loading,
    isSeeding: seedMutation.loading,
  };
}
