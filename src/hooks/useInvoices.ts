'use client';

import { useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import { useApi, useMutation } from './useApi';
import type {
  Invoice,
  InvoiceSummary,
  InvoiceType,
  InvoiceStatus,
  CreateInvoiceDTO,
  UpdateInvoiceDTO,
  InvoiceLine,
} from '@/lib/api/types';

// ─────────────────────────────────────────────────────────────────────────────
// Invoices Hook — list, create, update, delete, PDF, workflow
// ─────────────────────────────────────────────────────────────────────────────

// ─── Types ───────────────────────────────────────────────────────────────────

export interface InvoiceFilters {
  dossier_id?: string;
  type?: InvoiceType;
  status?: InvoiceStatus;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface InvoiceListResponse {
  items: InvoiceSummary[];
  total: number;
  page: number;
  page_size: number;
}

export interface MarkPaidData {
  payment_method?: string;
  payment_ref?: string;
  paid_amount?: number;
}

export interface MarkPaidResponse {
  message: string;
  paid_at: string;
  generated_invoice?: {
    id: number;
    number: string;
    type: 'FA';
    total_ttc: number;
  };
}

export interface CancelData {
  reason: string;
  create_credit_note?: boolean;
}

export interface InvoiceLineCreate {
  description: string;
  details?: string;
  quantity?: number;
  unit_price_ttc: number;
  line_type?: string;
}

export interface InvoiceLineUpdate {
  description?: string;
  details?: string;
  quantity?: number;
  unit_price_ttc?: number;
  line_type?: string;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Hook for managing invoices (list, create, update, delete, PDF, workflow).
 *
 * Provides:
 * - List invoices with filters (dossier_id, type, status, search)
 * - CRUD operations
 * - PDF generation and download
 * - Workflow advancement (DEV → PRO → FA)
 * - Mark paid, cancel, send
 * - Line management (add, update, delete)
 */
export function useInvoices(filters?: InvoiceFilters) {
  // ---- Fetch list ----
  const fetcher = useCallback(async () => {
    const parts: string[] = [];
    if (filters?.dossier_id) parts.push(`dossier_id=${filters.dossier_id}`);
    if (filters?.type) parts.push(`type=${filters.type}`);
    if (filters?.status) parts.push(`status=${filters.status}`);
    if (filters?.search) parts.push(`search=${encodeURIComponent(filters.search)}`);
    if (filters?.page) parts.push(`page=${filters.page}`);
    if (filters?.page_size) parts.push(`page_size=${filters.page_size}`);
    const qs = parts.length > 0 ? `?${parts.join('&')}` : '';
    return apiClient.get<InvoiceListResponse>(`/invoices${qs}`);
  }, [filters?.dossier_id, filters?.type, filters?.status, filters?.search, filters?.page, filters?.page_size]);

  const result = useApi(fetcher, {
    immediate: true,
    deps: [filters?.dossier_id, filters?.type, filters?.status, filters?.search, filters?.page, filters?.page_size],
  });

  // ---- Create ----
  const createMutation = useMutation(
    async (data: CreateInvoiceDTO) => {
      return apiClient.post<Invoice>('/invoices', data);
    }
  );

  // ---- Update ----
  const updateMutation = useMutation(
    async ({ id, data }: { id: number; data: UpdateInvoiceDTO }) => {
      return apiClient.patch<Invoice>(`/invoices/${id}`, data);
    }
  );

  // ---- Delete ----
  const deleteMutation = useMutation(
    async (id: number) => {
      return apiClient.delete(`/invoices/${id}`);
    }
  );

  // ---- Generate PDF ----
  const generatePdfMutation = useMutation(
    async (id: number) => {
      return apiClient.post<{ pdf_url: string; generated_at: string }>(`/invoices/${id}/generate-pdf`, {});
    }
  );

  // ---- Send ----
  const sendMutation = useMutation(
    async ({ id, to_email }: { id: number; to_email: string }) => {
      return apiClient.post<{ message: string; sent_at: string; sent_to: string }>(
        `/invoices/${id}/send`,
        { to_email }
      );
    }
  );

  // ---- Mark Paid ----
  const markPaidMutation = useMutation(
    async ({ id, data }: { id: number; data: MarkPaidData }) => {
      return apiClient.post<MarkPaidResponse>(`/invoices/${id}/mark-paid`, data);
    }
  );

  // ---- Cancel ----
  const cancelMutation = useMutation(
    async ({ id, data }: { id: number; data: CancelData }) => {
      return apiClient.post<{ message: string; credit_note_id?: number; credit_note_number?: string }>(
        `/invoices/${id}/cancel`,
        data
      );
    }
  );

  // ---- Advance Workflow ----
  const advanceMutation = useMutation(
    async (id: number) => {
      return apiClient.post<Invoice>(`/invoices/${id}/advance`, {});
    }
  );

  // ---- Add Line ----
  const addLineMutation = useMutation(
    async ({ invoiceId, data }: { invoiceId: number; data: InvoiceLineCreate }) => {
      return apiClient.post<InvoiceLine>(`/invoices/${invoiceId}/lines`, data);
    }
  );

  // ---- Update Line ----
  const updateLineMutation = useMutation(
    async ({ invoiceId, lineId, data }: { invoiceId: number; lineId: number; data: InvoiceLineUpdate }) => {
      return apiClient.patch<InvoiceLine>(`/invoices/${invoiceId}/lines/${lineId}`, data);
    }
  );

  // ---- Delete Line ----
  const deleteLineMutation = useMutation(
    async ({ invoiceId, lineId }: { invoiceId: number; lineId: number }) => {
      return apiClient.delete(`/invoices/${invoiceId}/lines/${lineId}`);
    }
  );

  return {
    // List
    invoices: result.data?.items || [],
    total: result.data?.total || 0,
    isLoading: result.loading,
    error: result.error,
    refetch: result.refetch,
    // CRUD
    create: createMutation.mutate,
    creating: createMutation.loading,
    update: updateMutation.mutate,
    updating: updateMutation.loading,
    remove: deleteMutation.mutate,
    removing: deleteMutation.loading,
    // PDF
    generatePdf: generatePdfMutation.mutate,
    generatingPdf: generatePdfMutation.loading,
    // Actions
    send: sendMutation.mutate,
    sending: sendMutation.loading,
    markPaid: markPaidMutation.mutate,
    markingPaid: markPaidMutation.loading,
    cancel: cancelMutation.mutate,
    cancelling: cancelMutation.loading,
    advance: advanceMutation.mutate,
    advancing: advanceMutation.loading,
    // Lines
    addLine: addLineMutation.mutate,
    addingLine: addLineMutation.loading,
    updateLine: updateLineMutation.mutate,
    updatingLine: updateLineMutation.loading,
    deleteLine: deleteLineMutation.mutate,
    deletingLine: deleteLineMutation.loading,
  };
}

// ─── Standalone: Get Invoice Detail ──────────────────────────────────────────

/**
 * Hook for fetching a single invoice with full details.
 * GET /invoices/{id}
 */
export function useInvoiceDetail(invoiceId: number | undefined) {
  const fetcher = useCallback(async () => {
    if (!invoiceId) return null;
    return apiClient.get<Invoice>(`/invoices/${invoiceId}`);
  }, [invoiceId]);

  const result = useApi(fetcher, {
    immediate: !!invoiceId,
    deps: [invoiceId],
  });

  return {
    invoice: result.data,
    isLoading: result.loading,
    error: result.error,
    refetch: result.refetch,
  };
}

// ─── Standalone: Get Invoice PDF URL ──────────────────────────────────────────

/**
 * Hook for getting an invoice PDF URL.
 * GET /invoices/{id}/pdf
 */
export function useInvoicePdf(invoiceId: number | undefined) {
  const fetcher = useCallback(async () => {
    if (!invoiceId) return null;
    return apiClient.get<{ pdf_url: string; generated_at: string }>(`/invoices/${invoiceId}/pdf`);
  }, [invoiceId]);

  const result = useApi(fetcher, {
    immediate: !!invoiceId,
    deps: [invoiceId],
  });

  return {
    pdfUrl: result.data?.pdf_url || null,
    generatedAt: result.data?.generated_at || null,
    isLoading: result.loading,
    error: result.error,
    refetch: result.refetch,
  };
}
