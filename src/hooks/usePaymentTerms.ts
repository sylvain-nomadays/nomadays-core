'use client';

import { useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import { useApi, useMutation } from './useApi';
import type {
  PaymentTerms,
  CreatePaymentTermsDTO,
  UpdatePaymentTermsDTO,
  PaginatedResponse,
  SupplierPaymentAlert,
  CalculatedPaymentDue,
} from '@/lib/api/types';

// ============================================================================
// Payment Terms CRUD Hooks
// ============================================================================

/**
 * Hook to fetch payment terms for a specific supplier
 */
export function useSupplierPaymentTerms(supplierId: number | null) {
  const fetcher = useCallback(async () => {
    if (!supplierId) throw new Error('Supplier ID is required');
    return apiClient.get<PaymentTerms[]>(`/suppliers/${supplierId}/payment-terms`);
  }, [supplierId]);

  return useApi(fetcher, { immediate: !!supplierId });
}

/**
 * Hook to fetch a single payment terms configuration
 */
export function usePaymentTerms(id: number | null) {
  const fetcher = useCallback(async () => {
    if (!id) throw new Error('Payment terms ID is required');
    return apiClient.get<PaymentTerms>(`/payment-terms/${id}`);
  }, [id]);

  return useApi(fetcher, { immediate: !!id });
}

/**
 * Hook to create payment terms
 */
export function useCreatePaymentTerms() {
  const mutationFn = useCallback(async (data: CreatePaymentTermsDTO) => {
    return apiClient.post<PaymentTerms>('/payment-terms', data);
  }, []);

  return useMutation(mutationFn);
}

/**
 * Hook to update payment terms
 */
export function useUpdatePaymentTerms() {
  const mutationFn = useCallback(
    async ({ id, data }: { id: number; data: UpdatePaymentTermsDTO }) => {
      return apiClient.patch<PaymentTerms>(`/payment-terms/${id}`, data);
    },
    []
  );

  return useMutation(mutationFn);
}

/**
 * Hook to delete payment terms
 */
export function useDeletePaymentTerms() {
  const mutationFn = useCallback(async (id: number) => {
    return apiClient.delete<void>(`/payment-terms/${id}`);
  }, []);

  return useMutation(mutationFn);
}

/**
 * Hook to set default payment terms for a supplier
 */
export function useSetDefaultPaymentTerms() {
  const mutationFn = useCallback(
    async ({ supplierId, paymentTermsId }: { supplierId: number; paymentTermsId: number }) => {
      return apiClient.patch<void>(`/suppliers/${supplierId}`, {
        default_payment_terms_id: paymentTermsId,
      });
    },
    []
  );

  return useMutation(mutationFn);
}

// ============================================================================
// Payment Due Calculation Hooks
// ============================================================================

/**
 * Hook to get calculated payment dues for a booking
 * Returns the payment schedule based on the supplier's payment terms
 */
export function useBookingPaymentDues(bookingId: number | null) {
  const fetcher = useCallback(async () => {
    if (!bookingId) throw new Error('Booking ID is required');
    return apiClient.get<CalculatedPaymentDue[]>(`/bookings/${bookingId}/payment-dues`);
  }, [bookingId]);

  return useApi(fetcher, { immediate: !!bookingId });
}

/**
 * Hook to get payment dues for a dossier (all bookings)
 */
export function useDossierPaymentDues(dossierId: number | null) {
  const fetcher = useCallback(async () => {
    if (!dossierId) throw new Error('Dossier ID is required');
    return apiClient.get<CalculatedPaymentDue[]>(`/dossiers/${dossierId}/payment-dues`);
  }, [dossierId]);

  return useApi(fetcher, { immediate: !!dossierId });
}

// ============================================================================
// Payment Alerts Hooks
// ============================================================================

/**
 * Hook to get upcoming payment alerts (for dashboard)
 */
export function usePaymentAlerts(params?: {
  days_ahead?: number;
  include_overdue?: boolean;
}) {
  const fetcher = useCallback(async () => {
    const searchParams = new URLSearchParams();
    if (params?.days_ahead) {
      searchParams.append('days_ahead', String(params.days_ahead));
    }
    if (params?.include_overdue !== undefined) {
      searchParams.append('include_overdue', String(params.include_overdue));
    }

    const query = searchParams.toString();
    const endpoint = `/payment-alerts${query ? `?${query}` : ''}`;
    return apiClient.get<SupplierPaymentAlert[]>(endpoint);
  }, [params?.days_ahead, params?.include_overdue]);

  return useApi(fetcher);
}

/**
 * Hook to get payment alerts for a specific supplier
 */
export function useSupplierPaymentAlerts(supplierId: number | null) {
  const fetcher = useCallback(async () => {
    if (!supplierId) throw new Error('Supplier ID is required');
    return apiClient.get<SupplierPaymentAlert[]>(`/suppliers/${supplierId}/payment-alerts`);
  }, [supplierId]);

  return useApi(fetcher, { immediate: !!supplierId });
}

/**
 * Hook to get overdue payments (for critical alerts)
 */
export function useOverduePayments() {
  const fetcher = useCallback(async () => {
    return apiClient.get<SupplierPaymentAlert[]>('/payment-alerts?overdue_only=true');
  }, []);

  return useApi(fetcher);
}

// ============================================================================
// Payment Recording Hooks
// ============================================================================

/**
 * Hook to mark a payment as paid
 */
export function useMarkPaymentPaid() {
  const mutationFn = useCallback(
    async ({
      bookingId,
      installmentNumber,
      paidAmount,
      paidAt,
    }: {
      bookingId: number;
      installmentNumber: number;
      paidAmount: number;
      paidAt?: string;
    }) => {
      return apiClient.post<void>(`/bookings/${bookingId}/payments`, {
        installment_number: installmentNumber,
        paid_amount: paidAmount,
        paid_at: paidAt || new Date().toISOString(),
      });
    },
    []
  );

  return useMutation(mutationFn);
}

// ============================================================================
// Cash Flow Hooks
// ============================================================================

/**
 * Hook to get cash flow projection
 * Returns expected payments grouped by date/period
 */
export function useCashFlowProjection(params?: {
  start_date?: string;
  end_date?: string;
  group_by?: 'day' | 'week' | 'month';
}) {
  const fetcher = useCallback(async () => {
    const searchParams = new URLSearchParams();
    if (params?.start_date) searchParams.append('start_date', params.start_date);
    if (params?.end_date) searchParams.append('end_date', params.end_date);
    if (params?.group_by) searchParams.append('group_by', params.group_by);

    const query = searchParams.toString();
    return apiClient.get<{
      period: string;
      total_due: number;
      currency: string;
      payments: CalculatedPaymentDue[];
    }[]>(`/cash-flow/projection${query ? `?${query}` : ''}`);
  }, [params?.start_date, params?.end_date, params?.group_by]);

  return useApi(fetcher);
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format payment due for display
 */
export function formatPaymentDue(due: CalculatedPaymentDue): string {
  const parts = [
    `${due.percentage}%`,
    `(${due.amount.toLocaleString('fr-FR')} ${due.currency})`,
  ];

  if (due.installment_label) {
    parts.unshift(due.installment_label);
  }

  return parts.join(' - ');
}

/**
 * Get payment status color
 */
export function getPaymentStatusColor(status: CalculatedPaymentDue['status']): string {
  switch (status) {
    case 'pending':
      return 'bg-gray-100 text-gray-700';
    case 'due':
      return 'bg-amber-100 text-amber-700';
    case 'overdue':
      return 'bg-red-100 text-red-700';
    case 'paid':
      return 'bg-emerald-100 text-emerald-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

/**
 * Get payment alert severity color
 */
export function getAlertSeverityColor(severity: SupplierPaymentAlert['severity']): string {
  switch (severity) {
    case 'info':
      return 'bg-blue-100 text-blue-700';
    case 'warning':
      return 'bg-amber-100 text-amber-700';
    case 'critical':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}
