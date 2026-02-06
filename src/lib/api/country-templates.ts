/**
 * Country Templates API module
 * Manages default templates for inclusions, exclusions, formalities, etc.
 */

import { apiClient } from './client';
import type {
  CountryTemplate,
  CreateCountryTemplateDTO,
  UpdateCountryTemplateDTO,
  TemplatesForCountry,
  TemplateType,
} from './types';

export interface CountryTemplateListResponse {
  items: CountryTemplate[];
  total: number;
}

// ============================================================================
// Template CRUD
// ============================================================================

/**
 * List all templates for the tenant.
 */
export async function getTemplates(params?: {
  template_type?: TemplateType;
  country_code?: string; // Use 'global' for NULL
}): Promise<CountryTemplate[]> {
  const queryParams = new URLSearchParams();
  if (params?.template_type) queryParams.append('template_type', params.template_type);
  if (params?.country_code) queryParams.append('country_code', params.country_code);

  const query = queryParams.toString();
  return apiClient.get(`/templates${query ? `?${query}` : ''}`);
}

/**
 * Get all templates for a specific country (with global fallback).
 */
export async function getTemplatesForCountry(
  countryCode: string
): Promise<TemplatesForCountry> {
  return apiClient.get(`/templates/for-country/${countryCode}`);
}

/**
 * Create a new template.
 */
export async function createTemplate(
  data: CreateCountryTemplateDTO
): Promise<CountryTemplate> {
  return apiClient.post('/templates', data);
}

/**
 * Get a specific template.
 */
export async function getTemplate(id: number): Promise<CountryTemplate> {
  return apiClient.get(`/templates/${id}`);
}

/**
 * Update a template.
 */
export async function updateTemplate(
  id: number,
  data: UpdateCountryTemplateDTO
): Promise<CountryTemplate> {
  return apiClient.patch(`/templates/${id}`, data);
}

/**
 * Delete a template.
 */
export async function deleteTemplate(id: number): Promise<void> {
  return apiClient.delete(`/templates/${id}`);
}

/**
 * Seed default templates for the tenant.
 */
export async function seedDefaultTemplates(): Promise<{ message: string; created_count: number }> {
  return apiClient.post('/templates/seed-defaults', {});
}
