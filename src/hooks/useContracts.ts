'use client';

import { useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import { useApi, useMutation } from './useApi';
import type { Contract, ContractRate, PaginatedResponse, ContractStatus } from '@/lib/api/types';

interface ContractsFilters {
  supplier_id?: number;
  status?: ContractStatus;
  search?: string;
  expiring_within_days?: number;
  page?: number;
  page_size?: number;
}

interface CreateContractDTO {
  supplier_id: number;
  name: string;
  reference?: string;
  valid_from: string;
  valid_to: string;
  currency?: string;
  notes?: string;
}

interface CreateContractRateDTO {
  name: string;
  unit_type: string;
  unit_cost: number;
  currency: string;
  valid_from?: string;
  valid_to?: string;
  meta_json?: Record<string, unknown>;
}

/**
 * Hook to fetch contracts list
 */
export function useContracts(filters: ContractsFilters = {}) {
  const fetcher = useCallback(async () => {
    const params = new URLSearchParams();
    if (filters.supplier_id) params.append('supplier_id', String(filters.supplier_id));
    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);
    if (filters.expiring_within_days) params.append('expiring_within_days', String(filters.expiring_within_days));
    if (filters.page) params.append('page', String(filters.page));
    if (filters.page_size) params.append('page_size', String(filters.page_size));

    const query = params.toString();
    const endpoint = `/contracts${query ? `?${query}` : ''}`;
    return apiClient.get<PaginatedResponse<Contract>>(endpoint);
  }, [filters.supplier_id, filters.status, filters.search, filters.expiring_within_days, filters.page, filters.page_size]);

  return useApi(fetcher);
}

/**
 * Hook to fetch a single contract
 */
export function useContract(id: number | string | null) {
  const fetcher = useCallback(async () => {
    if (!id) throw new Error('Contract ID is required');
    return apiClient.get<Contract>(`/contracts/${id}`);
  }, [id]);

  return useApi(fetcher, { immediate: !!id });
}

/**
 * Hook to fetch contract rates
 */
export function useContractRates(contractId: number | null) {
  const fetcher = useCallback(async () => {
    if (!contractId) throw new Error('Contract ID is required');
    return apiClient.get<ContractRate[]>(`/contracts/${contractId}/rates`);
  }, [contractId]);

  return useApi(fetcher, { immediate: !!contractId });
}

/**
 * Hook to create a contract
 */
export function useCreateContract() {
  const mutationFn = useCallback(async (data: CreateContractDTO) => {
    return apiClient.post<Contract>('/contracts', data);
  }, []);

  return useMutation(mutationFn);
}

/**
 * Hook to update a contract
 */
export function useUpdateContract() {
  const mutationFn = useCallback(async ({ id, data }: { id: number; data: Partial<CreateContractDTO> }) => {
    return apiClient.patch<Contract>(`/contracts/${id}`, data);
  }, []);

  return useMutation(mutationFn);
}

/**
 * Hook to add a rate to a contract
 */
export function useAddContractRate() {
  const mutationFn = useCallback(async ({ contractId, data }: { contractId: number; data: CreateContractRateDTO }) => {
    return apiClient.post<ContractRate>(`/contracts/${contractId}/rates`, data);
  }, []);

  return useMutation(mutationFn);
}

/**
 * Hook to delete a contract
 */
export function useDeleteContract() {
  const mutationFn = useCallback(async (id: number) => {
    return apiClient.delete<void>(`/contracts/${id}`);
  }, []);

  return useMutation(mutationFn);
}

/**
 * Hook to renew a contract
 */
export function useRenewContract() {
  const mutationFn = useCallback(async ({ id, newValidTo }: { id: number; newValidTo: string }) => {
    return apiClient.post<Contract>(`/contracts/${id}/renew`, { valid_to: newValidTo });
  }, []);

  return useMutation(mutationFn);
}
