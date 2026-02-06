'use client';

import { useState, useCallback } from 'react';
import { useApi } from './useApi';
import {
  getTemplates,
  getTemplatesForCountry,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  seedDefaultTemplates,
} from '@/lib/api/country-templates';
import type {
  CountryTemplate,
  CreateCountryTemplateDTO,
  UpdateCountryTemplateDTO,
  TemplatesForCountry,
  TemplateType,
} from '@/lib/api/types';

/**
 * Hook for listing all templates
 */
export function useCountryTemplates(params?: {
  template_type?: TemplateType;
  country_code?: string;
}) {
  const fetcher = useCallback(() => getTemplates(params), [params]);
  const result = useApi(fetcher);

  return {
    templates: result.data || [],
    isLoading: result.loading,
    error: result.error,
    refetch: result.refetch,
  };
}

/**
 * Hook for getting templates for a specific country
 */
export function useTemplatesForCountry(countryCode: string | null) {
  const fetcher = useCallback(
    () => (countryCode ? getTemplatesForCountry(countryCode) : Promise.resolve(null)),
    [countryCode]
  );
  const result = useApi(fetcher);

  return {
    templates: result.data as TemplatesForCountry | null,
    inclusions: result.data?.inclusions || [],
    exclusions: result.data?.exclusions || [],
    formalities: result.data?.formalities || '',
    bookingConditions: result.data?.booking_conditions || '',
    cancellationPolicy: result.data?.cancellation_policy || '',
    generalInfo: result.data?.general_info || '',
    isLoading: result.loading,
    error: result.error,
    refetch: result.refetch,
  };
}

/**
 * Hook for creating a template
 */
export function useCreateTemplate() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const create = async (data: CreateCountryTemplateDTO): Promise<CountryTemplate | null> => {
    setLoading(true);
    setError(null);
    try {
      const template = await createTemplate(data);
      return template;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to create template'));
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { create, loading, error };
}

/**
 * Hook for updating a template
 */
export function useUpdateTemplate() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const update = async (
    id: number,
    data: UpdateCountryTemplateDTO
  ): Promise<CountryTemplate | null> => {
    setLoading(true);
    setError(null);
    try {
      const template = await updateTemplate(id, data);
      return template;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update template'));
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { update, loading, error };
}

/**
 * Hook for deleting a template
 */
export function useDeleteTemplate() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const remove = async (id: number): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await deleteTemplate(id);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete template'));
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { remove, loading, error };
}

/**
 * Hook for seeding default templates
 */
export function useSeedDefaultTemplates() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const seed = async (): Promise<{ message: string; created_count: number } | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await seedDefaultTemplates();
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to seed templates'));
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { seed, loading, error };
}
