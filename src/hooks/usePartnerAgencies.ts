'use client';

/**
 * React hooks for Partner Agencies management
 *
 * Provides easy access to B2B partner agencies with custom
 * branding and templates for white-label documents.
 */

import { useState, useCallback, useEffect } from 'react';
import * as partnerAgenciesApi from '@/lib/api/partner-agencies';
import type {
  PartnerAgency,
  PartnerAgencyBranding,
  PartnerAgencyTemplates,
  CreatePartnerAgencyDTO,
  UpdatePartnerAgencyDTO,
} from '@/lib/api/types';

// ============================================================================
// List Hook
// ============================================================================

export interface UsePartnerAgenciesOptions {
  includeInactive?: boolean;
  autoFetch?: boolean;
}

export function usePartnerAgencies(options: UsePartnerAgenciesOptions = {}) {
  const { includeInactive = false, autoFetch = true } = options;

  const [agencies, setAgencies] = useState<PartnerAgency[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchAgencies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await partnerAgenciesApi.getPartnerAgencies(includeInactive);
      setAgencies(response.items);
      return response.items;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch partner agencies');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [includeInactive]);

  useEffect(() => {
    if (autoFetch) {
      fetchAgencies();
    }
  }, [autoFetch, fetchAgencies]);

  return {
    agencies,
    loading,
    error,
    refetch: fetchAgencies,
  };
}

// ============================================================================
// Single Agency Hook
// ============================================================================

export function usePartnerAgency(id: number | null) {
  const [agency, setAgency] = useState<PartnerAgency | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchAgency = useCallback(async () => {
    if (!id) {
      setAgency(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await partnerAgenciesApi.getPartnerAgency(id);
      setAgency(data);
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch partner agency');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAgency();
  }, [fetchAgency]);

  return {
    agency,
    loading,
    error,
    refetch: fetchAgency,
  };
}

// ============================================================================
// CRUD Hooks
// ============================================================================

export function useCreatePartnerAgency() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createAgency = useCallback(async (data: CreatePartnerAgencyDTO) => {
    setLoading(true);
    setError(null);
    try {
      const result = await partnerAgenciesApi.createPartnerAgency(data);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create partner agency');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    createAgency,
    loading,
    error,
  };
}

export function useUpdatePartnerAgency() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateAgency = useCallback(async (id: number, data: UpdatePartnerAgencyDTO) => {
    setLoading(true);
    setError(null);
    try {
      const result = await partnerAgenciesApi.updatePartnerAgency(id, data);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update partner agency');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    updateAgency,
    loading,
    error,
  };
}

export function useDeletePartnerAgency() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteAgency = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      await partnerAgenciesApi.deletePartnerAgency(id);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete partner agency');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    deleteAgency,
    loading,
    error,
  };
}

// ============================================================================
// Branding & Templates Hooks
// ============================================================================

export function usePartnerBranding(agencyId: number | null) {
  const [branding, setBranding] = useState<PartnerAgencyBranding | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchBranding = useCallback(async () => {
    if (!agencyId) {
      setBranding(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await partnerAgenciesApi.getPartnerBranding(agencyId);
      setBranding(data);
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch partner branding');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => {
    fetchBranding();
  }, [fetchBranding]);

  return {
    branding,
    loading,
    error,
    refetch: fetchBranding,
  };
}

export function usePartnerTemplates(agencyId: number | null) {
  const [templates, setTemplates] = useState<PartnerAgencyTemplates | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchTemplates = useCallback(async () => {
    if (!agencyId) {
      setTemplates(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await partnerAgenciesApi.getPartnerTemplates(agencyId);
      setTemplates(data);
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch partner templates');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return {
    templates,
    loading,
    error,
    refetch: fetchTemplates,
  };
}

// ============================================================================
// Combined Hook for Dossier Context
// ============================================================================

/**
 * Hook to get templates and branding based on dossier's partner agency
 *
 * Use this when displaying or editing a dossier to automatically
 * load the correct partner-specific content.
 */
export function usePartnerContextForDossier(partnerAgencyId: number | null | undefined) {
  const { branding, loading: brandingLoading } = usePartnerBranding(partnerAgencyId ?? null);
  const { templates, loading: templatesLoading } = usePartnerTemplates(partnerAgencyId ?? null);

  return {
    branding,
    templates,
    loading: brandingLoading || templatesLoading,
    hasPartner: !!partnerAgencyId,
  };
}
