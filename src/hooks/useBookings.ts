'use client';

import { useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import { useApi, useMutation } from './useApi';

// ─────────────────────────────────────────────────────────────────────────────
// Bookings Hook — list, send request, update status, delete + pre-bookings
// ─────────────────────────────────────────────────────────────────────────────

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BookingListItem {
  id: number;
  trip_id: number;
  trip_name?: string | null;
  supplier_id?: number | null;
  supplier_name?: string | null;
  supplier_email?: string | null;
  description: string;
  service_date_start: string;
  service_date_end: string;
  booked_amount: number;
  currency: string;
  status: 'pending' | 'sent' | 'confirmed' | 'modified' | 'cancelled' | 'declined' | 'pending_cancellation';
  is_pre_booking: boolean;
  confirmation_ref?: string | null;
  requested_by_name?: string | null;
  formula_name?: string | null;
  block_type?: string | null;
  pax_count?: number | null;
  guest_names?: string | null;
  email_sent_at?: string | null;
  logistics_alternative?: string | null;
  created_at: string;
}

export interface BookingFilters {
  trip_id?: number;
  status?: string;
  is_pre_booking?: boolean;
  supplier_id?: number;
}

export interface BookingStatusUpdate {
  status: string;
  confirmation_ref?: string;
  supplier_response_note?: string;
}

export interface PreBookingRequest {
  item_ids: number[];
  pax_count?: number;
  guest_names?: string;
  notes?: string;
}

export interface BookableItem {
  item_id: number;
  item_name: string;
  supplier_id?: number | null;
  supplier_name?: string | null;
  supplier_email?: string | null;
  block_type?: string | null;
  formula_name?: string | null;
  formula_id?: number | null;
  day_number?: number | null;
  service_date_start?: string | null;
  service_date_end?: string | null;
  requires_pre_booking: boolean;
  already_booked: boolean;
  booking_status?: 'pending' | 'sent' | 'confirmed' | 'modified' | 'cancelled' | 'declined' | 'pending_cancellation' | null;
  booking_requested_at?: string | null;
  booking_requested_by?: string | null;
  booking_days_waiting?: number | null;
  booking_overdue?: boolean;
  // Echanges tab fields
  cost_nature_code?: string | null;
  cost_nature_label?: string | null;
  booking_id?: number | null;
  supplier_response_note?: string | null;
  logistics_alternative?: string | null;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Hook for managing bookings (list, send request, update status, delete).
 *
 * Provides:
 * - List bookings with filters (trip_id, status, is_pre_booking, supplier_id)
 * - Send booking request email
 * - Update booking status
 * - Delete a booking
 */
export function useBookings(filters?: BookingFilters) {
  // ---- Fetch ----
  const fetcher = useCallback(async () => {
    let qs = '';
    const parts: string[] = [];
    if (filters?.trip_id != null) parts.push(`trip_id=${filters.trip_id}`);
    if (filters?.status) parts.push(`status=${filters.status}`);
    if (filters?.is_pre_booking != null) parts.push(`is_pre_booking=${filters.is_pre_booking}`);
    if (filters?.supplier_id != null) parts.push(`supplier_id=${filters.supplier_id}`);
    if (parts.length > 0) qs = `?${parts.join('&')}`;
    return apiClient.get<BookingListItem[]>(`/bookings${qs}`);
  }, [filters?.trip_id, filters?.status, filters?.is_pre_booking, filters?.supplier_id]);

  const result = useApi(fetcher, {
    immediate: true,
    deps: [filters?.trip_id, filters?.status, filters?.is_pre_booking, filters?.supplier_id],
  });

  // ---- Send request ----
  const sendRequestMutation = useMutation(
    async (id: number) => {
      return apiClient.post<BookingListItem>(`/bookings/${id}/send-request`, {});
    }
  );

  // ---- Send cancellation ----
  const sendCancellationMutation = useMutation(
    async (id: number) => {
      return apiClient.post<BookingListItem>(`/bookings/${id}/send-cancellation`, {});
    }
  );

  // ---- Update status ----
  const updateStatusMutation = useMutation(
    async ({ id, data }: { id: number; data: BookingStatusUpdate }) => {
      return apiClient.patch<BookingListItem>(`/bookings/${id}/status`, data);
    }
  );

  // ---- Delete ----
  const deleteMutation = useMutation(
    async (id: number) => {
      return apiClient.delete(`/bookings/${id}`);
    }
  );

  return {
    bookings: result.data || [],
    isLoading: result.loading,
    error: result.error,
    refetch: result.refetch,
    // Mutations
    sendRequest: sendRequestMutation.mutate,
    sendingRequest: sendRequestMutation.loading,
    sendCancellation: sendCancellationMutation.mutate,
    sendingCancellation: sendCancellationMutation.loading,
    updateStatus: updateStatusMutation.mutate,
    updatingStatus: updateStatusMutation.loading,
    remove: deleteMutation.mutate,
    removing: deleteMutation.loading,
  };
}

// ─── Standalone: Request Pre-Bookings ────────────────────────────────────────

/**
 * Standalone hook for requesting pre-bookings from a circuit page.
 * POST /trips/{tripId}/request-pre-bookings
 */
export function useRequestPreBookings() {
  const mutation = useMutation(
    async ({ tripId, data }: { tripId: number; data: PreBookingRequest }) => {
      return apiClient.post<BookingListItem[]>(
        `/trips/${tripId}/request-pre-bookings`,
        data
      );
    }
  );

  return {
    requestPreBookings: mutation.mutate,
    requesting: mutation.loading,
  };
}

// ─── Standalone: Bookable Items ──────────────────────────────────────────────

/**
 * Hook for fetching bookable items for a given trip.
 * GET /trips/{tripId}/bookable-items
 */
export function useBookableItems(tripId: number | undefined) {
  const fetcher = useCallback(async () => {
    if (!tripId) return [];
    return apiClient.get<BookableItem[]>(`/trips/${tripId}/bookable-items`);
  }, [tripId]);

  const result = useApi(fetcher, {
    immediate: !!tripId,
    deps: [tripId],
  });

  return {
    bookableItems: result.data || [],
    isLoading: result.loading,
    error: result.error,
    refetch: result.refetch,
  };
}
