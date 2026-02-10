'use client';

import { useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/api/client';
import { useApi, useMutation } from './useApi';
import type {
  Supplier,
  CreateSupplierDTO,
  UpdateSupplierDTO,
  PaginatedResponse,
  SupplierType,
  SupplierStatus,
  ContractValidityStatus,
  ContractQuotationAlert,
} from '@/lib/api/types';

export interface SuppliersFilters {
  type?: SupplierType;
  status?: SupplierStatus;
  search?: string;
  // Localisation filters
  location_id?: number;             // Recherche par location spécifique
  country_code?: string;
  city?: string;
  // Classification filters
  star_rating_min?: number;         // Pour hébergements: minimum étoiles
  star_rating_max?: number;         // Pour hébergements: maximum étoiles
  // Contract status filter
  contract_status?: ContractValidityStatus;  // Filter by calculated contract status
  // Tags
  tags?: string[];                  // Filtrer par tags
  // Pagination
  page?: number;
  page_size?: number;
}

/**
 * Hook to fetch suppliers list with advanced filters
 */
export function useSuppliers(filters: SuppliersFilters = {}) {
  const fetcher = useCallback(async () => {
    const params = new URLSearchParams();

    // Type & Status
    if (filters.type) params.append('type', filters.type);
    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);

    // Location filters
    if (filters.location_id) params.append('location_id', String(filters.location_id));
    if (filters.country_code) params.append('country_code', filters.country_code);
    if (filters.city) params.append('city', filters.city);

    // Classification filters
    if (filters.star_rating_min) params.append('star_rating_min', String(filters.star_rating_min));
    if (filters.star_rating_max) params.append('star_rating_max', String(filters.star_rating_max));

    // Contract status filter
    if (filters.contract_status) params.append('contract_status', filters.contract_status);

    // Tags (send as comma-separated)
    if (filters.tags && filters.tags.length > 0) {
      params.append('tags', filters.tags.join(','));
    }

    // Pagination
    if (filters.page) params.append('page', String(filters.page));
    if (filters.page_size) params.append('page_size', String(filters.page_size));

    const query = params.toString();
    const endpoint = `/suppliers${query ? `?${query}` : ''}`;
    return apiClient.get<PaginatedResponse<Supplier>>(endpoint);
  }, [
    filters.type,
    filters.status,
    filters.search,
    filters.location_id,
    filters.country_code,
    filters.city,
    filters.star_rating_min,
    filters.star_rating_max,
    filters.contract_status,
    filters.tags,
    filters.page,
    filters.page_size,
  ]);

  return useApi(fetcher, {
    immediate: true,
    deps: [
      filters.type,
      filters.status,
      filters.search,
      filters.location_id,
      filters.country_code,
      filters.city,
      filters.star_rating_min,
      filters.star_rating_max,
      filters.contract_status,
      filters.tags?.join(','),
      filters.page,
      filters.page_size,
    ],
  });
}

/**
 * Hook to search suppliers by location
 * Useful for quick searches like "Hotels in Chiang Mai"
 */
export function useSuppliersByLocation(
  locationId: number | null,
  type?: SupplierType
) {
  const fetcher = useCallback(async () => {
    if (!locationId) throw new Error('Location ID is required');

    const params = new URLSearchParams();
    params.append('location_id', String(locationId));
    if (type) params.append('type', type);
    params.append('status', 'active');

    const endpoint = `/suppliers?${params.toString()}`;
    return apiClient.get<PaginatedResponse<Supplier>>(endpoint);
  }, [locationId, type]);

  return useApi(fetcher, { immediate: !!locationId });
}

/**
 * Hook to search accommodations by star rating
 * Example: "4-star hotels in Chiang Mai"
 */
export function useAccommodationsByRating(params: {
  locationId?: number;
  minStars?: number;
  maxStars?: number;
}) {
  const fetcher = useCallback(async () => {
    const searchParams = new URLSearchParams();
    searchParams.append('type', 'accommodation');
    searchParams.append('status', 'active');

    if (params.locationId) searchParams.append('location_id', String(params.locationId));
    if (params.minStars) searchParams.append('star_rating_min', String(params.minStars));
    if (params.maxStars) searchParams.append('star_rating_max', String(params.maxStars));

    const endpoint = `/suppliers?${searchParams.toString()}`;
    return apiClient.get<PaginatedResponse<Supplier>>(endpoint);
  }, [params.locationId, params.minStars, params.maxStars]);

  return useApi(fetcher);
}

/**
 * Hook to fetch a single supplier
 */
export function useSupplier(id: number | string | null) {
  const fetcher = useCallback(async () => {
    if (!id) throw new Error('Supplier ID is required');
    return apiClient.get<Supplier>(`/suppliers/${id}`);
  }, [id]);

  return useApi(fetcher, { immediate: !!id });
}

/**
 * Hook to create a supplier
 */
export function useCreateSupplier() {
  const mutationFn = useCallback(async (data: CreateSupplierDTO) => {
    return apiClient.post<Supplier>('/suppliers', data);
  }, []);

  return useMutation(mutationFn);
}

/**
 * Hook to update a supplier
 */
export function useUpdateSupplier() {
  const mutationFn = useCallback(
    async ({ id, data }: { id: number; data: UpdateSupplierDTO }) => {
      return apiClient.patch<Supplier>(`/suppliers/${id}`, data);
    },
    []
  );

  return useMutation(mutationFn);
}

/**
 * Hook to delete a supplier
 * @param permanent - Si true, supprime définitivement. Sinon, désactive seulement.
 */
export function useDeleteSupplier() {
  const mutationFn = useCallback(async ({ id, permanent = false }: { id: number; permanent?: boolean }) => {
    const query = permanent ? '?permanent=true' : '';
    return apiClient.delete<void>(`/suppliers/${id}${query}`);
  }, []);

  return useMutation(mutationFn);
}

/**
 * Hook to add notes to a supplier
 */
export function useAddSupplierNote() {
  const mutationFn = useCallback(
    async ({
      id,
      noteType,
      content,
    }: {
      id: number;
      noteType: 'internal' | 'logistics' | 'quality';
      content: string;
    }) => {
      const fieldMap = {
        internal: 'internal_notes',
        logistics: 'logistics_notes',
        quality: 'quality_notes',
      };

      return apiClient.patch<Supplier>(`/suppliers/${id}`, {
        [fieldMap[noteType]]: content,
      });
    },
    []
  );

  return useMutation(mutationFn);
}

/**
 * Hook to update supplier tags
 */
export function useUpdateSupplierTags() {
  const mutationFn = useCallback(
    async ({ id, tags }: { id: number; tags: string[] }) => {
      return apiClient.patch<Supplier>(`/suppliers/${id}`, { tags });
    },
    []
  );

  return useMutation(mutationFn);
}

// ============================================================================
// Contract Status Helpers
// ============================================================================

/**
 * Get contract status label and color for a supplier
 */
export function getContractStatusDisplay(supplier: Supplier): {
  label: string;
  color: string;
  icon: 'check' | 'warning' | 'error' | 'none';
} {
  const status = supplier.contract_validity_status;
  const daysUntilExpiry = supplier.days_until_contract_expiry;

  switch (status) {
    case 'valid':
      return {
        label: `Contrat valide (expire dans ${daysUntilExpiry}j)`,
        color: 'bg-emerald-100 text-emerald-700',
        icon: 'check',
      };
    case 'expiring_soon':
      return {
        label: `Contrat expire dans ${daysUntilExpiry}j`,
        color: 'bg-amber-100 text-amber-700',
        icon: 'warning',
      };
    case 'expired':
      return {
        label: `Contrat expiré depuis ${Math.abs(daysUntilExpiry || 0)}j`,
        color: 'bg-red-100 text-red-700',
        icon: 'error',
      };
    case 'no_contract':
    default:
      return {
        label: 'Aucun contrat',
        color: 'bg-gray-100 text-gray-600',
        icon: 'none',
      };
  }
}

/**
 * Hook to check contract alerts for suppliers used in a quotation
 * Use this when building/reviewing a circuit to warn about contract issues
 */
export function useContractAlerts(supplierIds: number[]) {
  const fetcher = useCallback(async () => {
    if (!supplierIds.length) return [];

    // Fetch suppliers with contract status
    const params = new URLSearchParams();
    params.append('ids', supplierIds.join(','));
    params.append('include_contract_status', 'true');

    const response = await apiClient.get<PaginatedResponse<Supplier>>(
      `/suppliers?${params.toString()}`
    );

    // Generate alerts for problematic contracts
    const alerts: ContractQuotationAlert[] = [];

    for (const supplier of response.items) {
      if (supplier.contract_validity_status === 'expired') {
        alerts.push({
          supplier_id: supplier.id,
          supplier_name: supplier.name,
          alert_type: 'expired',
          contract_id: supplier.active_contract_id || undefined,
          contract_name: supplier.active_contract_name,
          contract_valid_to: supplier.contract_valid_to,
          days_until_expiry: supplier.days_until_contract_expiry,
          message: `Le contrat "${supplier.active_contract_name || 'N/A'}" de ${supplier.name} a expiré${supplier.contract_valid_to ? ` le ${new Date(supplier.contract_valid_to).toLocaleDateString('fr-FR')}` : ''}.`,
          severity: 'critical',
        });
      } else if (supplier.contract_validity_status === 'expiring_soon') {
        alerts.push({
          supplier_id: supplier.id,
          supplier_name: supplier.name,
          alert_type: 'expiring_soon',
          contract_id: supplier.active_contract_id || undefined,
          contract_name: supplier.active_contract_name,
          contract_valid_to: supplier.contract_valid_to,
          days_until_expiry: supplier.days_until_contract_expiry,
          message: `Le contrat "${supplier.active_contract_name || 'N/A'}" de ${supplier.name} expire dans ${supplier.days_until_contract_expiry} jours.`,
          severity: 'warning',
        });
      } else if (supplier.contract_validity_status === 'no_contract') {
        alerts.push({
          supplier_id: supplier.id,
          supplier_name: supplier.name,
          alert_type: 'no_contract',
          message: `${supplier.name} n'a pas de contrat actif. Les tarifs peuvent ne pas être à jour.`,
          severity: 'warning',
        });
      }
    }

    return alerts;
  }, [supplierIds]);

  return useApi(fetcher, { immediate: supplierIds.length > 0 });
}

/**
 * Hook to get suppliers with expiring contracts (for dashboard alerts)
 */
export function useSuppliersWithExpiringContracts(daysThreshold: number = 30) {
  const fetcher = useCallback(async () => {
    const params = new URLSearchParams();
    params.append('contract_status', 'expiring_soon');
    params.append('expiring_within_days', String(daysThreshold));
    params.append('status', 'active');

    return apiClient.get<PaginatedResponse<Supplier>>(`/suppliers?${params.toString()}`);
  }, [daysThreshold]);

  return useApi(fetcher);
}

/**
 * Hook to get suppliers with expired contracts
 */
export function useSuppliersWithExpiredContracts() {
  const fetcher = useCallback(async () => {
    const params = new URLSearchParams();
    params.append('contract_status', 'expired');
    params.append('status', 'active');

    return apiClient.get<PaginatedResponse<Supplier>>(`/suppliers?${params.toString()}`);
  }, []);

  return useApi(fetcher);
}

// ============================================================================
// Contract Workflow Actions
// ============================================================================

export type ContractWorkflowStatus = 'needs_contract' | 'contract_requested' | 'dynamic_pricing';

/**
 * Hook to update supplier contract workflow status
 * Used to request a contract or mark as dynamic pricing
 */
export function useUpdateContractWorkflow() {
  const mutationFn = useCallback(
    async ({
      id,
      status,
    }: {
      id: number;
      status: ContractWorkflowStatus;
    }) => {
      return apiClient.patch<Supplier>(`/suppliers/${id}/contract-workflow`, {
        contract_workflow_status: status,
      });
    },
    []
  );

  return useMutation(mutationFn);
}
