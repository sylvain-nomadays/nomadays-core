/**
 * Dossiers API module
 * Manages client travel inquiries
 */

import { apiClient } from './client';
import type {
  Dossier,
  CreateDossierDTO,
  UpdateDossierDTO,
  PaginatedResponse,
} from './types';

export interface DossierListParams {
  page?: number;
  page_size?: number;
  status?: string;
  is_hot?: boolean;
  assigned_to_id?: string;
  search?: string;
}

export interface DossierStats {
  by_status: Record<string, number>;
  hot_leads: number;
  total_active: number;
}

// List dossiers with filters
export async function getDossiers(
  params?: DossierListParams
): Promise<PaginatedResponse<Dossier>> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.append('page', params.page.toString());
  if (params?.page_size) searchParams.append('page_size', params.page_size.toString());
  if (params?.status) searchParams.append('status', params.status);
  if (params?.is_hot !== undefined) searchParams.append('is_hot', params.is_hot.toString());
  if (params?.assigned_to_id) searchParams.append('assigned_to_id', params.assigned_to_id);
  if (params?.search) searchParams.append('search', params.search);

  const query = searchParams.toString();
  return apiClient.get(`/dossiers${query ? `?${query}` : ''}`);
}

// Get single dossier by ID
export async function getDossier(id: string): Promise<Dossier> {
  return apiClient.get(`/dossiers/${id}`);
}

// Create new dossier
export async function createDossier(data: CreateDossierDTO): Promise<Dossier> {
  return apiClient.post('/dossiers', data);
}

// Update dossier
export async function updateDossier(id: string, data: UpdateDossierDTO): Promise<Dossier> {
  return apiClient.patch(`/dossiers/${id}`, data);
}

// Delete dossier
export async function deleteDossier(id: string): Promise<void> {
  return apiClient.delete(`/dossiers/${id}`);
}

// Mark dossier as lost
export async function markDossierLost(
  id: string,
  reason?: string,
  comment?: string
): Promise<Dossier> {
  const params = new URLSearchParams();
  if (reason) params.append('reason', reason);
  if (comment) params.append('comment', comment);
  const query = params.toString();
  return apiClient.post(`/dossiers/${id}/mark-lost${query ? `?${query}` : ''}`, {});
}

// Get dossier statistics
export async function getDossierStats(): Promise<DossierStats> {
  return apiClient.get('/dossiers/stats/summary');
}
