'use client';

import { useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import { useApi } from './useApi';
import type { DashboardStats, AIAlert } from '@/lib/api/types';

/**
 * Hook to fetch dashboard statistics
 */
export function useDashboardStats() {
  const fetcher = useCallback(async () => {
    return apiClient.get<DashboardStats>('/dashboard/stats');
  }, []);

  return useApi(fetcher);
}

/**
 * Hook to fetch recent alerts
 */
export function useRecentAlerts(limit: number = 10) {
  const fetcher = useCallback(async () => {
    return apiClient.get<AIAlert[]>(`/alerts?limit=${limit}&acknowledged=false`);
  }, [limit]);

  return useApi(fetcher);
}

/**
 * Hook to fetch expiring contracts
 */
export function useExpiringContracts(days: number = 30) {
  const fetcher = useCallback(async () => {
    return apiClient.get<{ contracts: unknown[]; count: number }>(`/dashboard/expiring-contracts?days=${days}`);
  }, [days]);

  return useApi(fetcher);
}
