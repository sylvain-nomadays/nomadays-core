/**
 * Partner Agencies API client
 *
 * Manages B2B partner agencies with custom branding and templates
 * for white-label document generation.
 */

import { apiClient } from './client';
import type {
  PartnerAgency,
  PartnerAgencyBranding,
  PartnerAgencyTemplates,
  CreatePartnerAgencyDTO,
  UpdatePartnerAgencyDTO,
} from './types';

// ============================================================================
// List & Get
// ============================================================================

export interface PartnerAgencyListResponse {
  items: PartnerAgency[];
  total: number;
}

/**
 * Get all partner agencies for the current tenant
 */
export async function getPartnerAgencies(includeInactive = false): Promise<PartnerAgencyListResponse> {
  const params = new URLSearchParams();
  if (includeInactive) {
    params.set('include_inactive', 'true');
  }
  const query = params.toString();
  return apiClient.get<PartnerAgencyListResponse>(`/partner-agencies${query ? `?${query}` : ''}`);
}

/**
 * Get a specific partner agency by ID
 */
export async function getPartnerAgency(id: number): Promise<PartnerAgency> {
  return apiClient.get<PartnerAgency>(`/partner-agencies/${id}`);
}

// ============================================================================
// Create, Update, Delete
// ============================================================================

/**
 * Create a new partner agency
 */
export async function createPartnerAgency(data: CreatePartnerAgencyDTO): Promise<PartnerAgency> {
  return apiClient.post<PartnerAgency>('/partner-agencies', data);
}

/**
 * Update a partner agency
 */
export async function updatePartnerAgency(id: number, data: UpdatePartnerAgencyDTO): Promise<PartnerAgency> {
  return apiClient.patch<PartnerAgency>(`/partner-agencies/${id}`, data);
}

/**
 * Delete a partner agency
 */
export async function deletePartnerAgency(id: number): Promise<void> {
  return apiClient.delete<void>(`/partner-agencies/${id}`);
}

// ============================================================================
// Branding & Templates
// ============================================================================

/**
 * Get branding configuration for a partner agency
 */
export async function getPartnerBranding(id: number): Promise<PartnerAgencyBranding> {
  return apiClient.get<PartnerAgencyBranding>(`/partner-agencies/${id}/branding`);
}

/**
 * Get templates for a partner agency
 */
export async function getPartnerTemplates(id: number): Promise<PartnerAgencyTemplates> {
  return apiClient.get<PartnerAgencyTemplates>(`/partner-agencies/${id}/templates`);
}

// ============================================================================
// Utility functions
// ============================================================================

/**
 * Get resolved templates for a dossier
 * Hierarchy: Partner Agency > Global
 *
 * This function helps get the correct template content based on
 * the dossier's partner agency assignment.
 */
export async function getTemplatesForDossier(
  partnerAgencyId?: number
): Promise<PartnerAgencyTemplates> {
  if (partnerAgencyId) {
    return getPartnerTemplates(partnerAgencyId);
  }

  // Return empty templates if no partner agency
  // The global templates should be loaded separately
  return {
    booking_conditions: undefined,
    cancellation_policy: undefined,
    general_info: undefined,
    legal_mentions: undefined,
  };
}
