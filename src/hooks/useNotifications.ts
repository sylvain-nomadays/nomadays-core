'use client';

import { useCallback, useEffect, useRef } from 'react';
import { apiClient } from '@/lib/api/client';
import { useApi, useMutation } from './useApi';

// ─────────────────────────────────────────────────────────────────────────────
// Notifications Hook — list, unread count, mark read
// ─────────────────────────────────────────────────────────────────────────────

// ─── Types ───────────────────────────────────────────────────────────────────

export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message?: string | null;
  link?: string | null;
  is_read: boolean;
  metadata_json?: Record<string, any> | null;
  created_at: string;
}

interface UnreadCountResponse {
  count: number;
}

// ─── Polling interval (ms) ───────────────────────────────────────────────────

const POLL_INTERVAL = 30_000;

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Hook for managing user notifications.
 *
 * Provides:
 * - Notification list (GET /notifications)
 * - Unread count with 30s polling (GET /notifications/unread-count)
 * - Mark single as read (PATCH /notifications/{id}/read)
 * - Mark all as read (POST /notifications/mark-all-read)
 */
export function useNotifications() {
  // ---- Fetch notifications list ----
  const listFetcher = useCallback(async () => {
    return apiClient.get<NotificationItem[]>('/notifications');
  }, []);

  const listResult = useApi(listFetcher, { immediate: true });

  // ---- Fetch unread count ----
  const unreadFetcher = useCallback(async () => {
    return apiClient.get<UnreadCountResponse>('/notifications/unread-count');
  }, []);

  const unreadResult = useApi(unreadFetcher, { immediate: true });

  // ---- Poll unread count every 30s ----
  const unreadRefetchRef = useRef(unreadResult.refetch);
  unreadRefetchRef.current = unreadResult.refetch;

  useEffect(() => {
    const interval = setInterval(() => {
      unreadRefetchRef.current();
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  // ---- Mark single notification as read ----
  const markAsReadMutation = useMutation(async (id: number) => {
    const result = await apiClient.patch<NotificationItem>(
      `/notifications/${id}/read`,
      {}
    );
    // Refetch both list and unread count after marking as read
    listResult.refetch();
    unreadResult.refetch();
    return result;
  });

  // ---- Mark all notifications as read ----
  const markAllReadMutation = useMutation(async () => {
    const result = await apiClient.post<{ updated: number }>(
      '/notifications/mark-all-read',
      {}
    );
    // Refetch both list and unread count after marking all as read
    listResult.refetch();
    unreadResult.refetch();
    return result;
  });

  return {
    notifications: listResult.data || [],
    unreadCount: unreadResult.data?.count ?? 0,
    isLoading: listResult.loading || unreadResult.loading,
    error: listResult.error || unreadResult.error,
    refetch: () => {
      listResult.refetch();
      unreadResult.refetch();
    },
    markAsRead: markAsReadMutation.mutate,
    markingAsRead: markAsReadMutation.loading,
    markAllRead: markAllReadMutation.mutate,
    markingAllRead: markAllReadMutation.loading,
  };
}
