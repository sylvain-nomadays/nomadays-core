/**
 * Travel Themes API module
 * Manages configurable travel themes/categories per tenant
 */

import { apiClient } from './client';
import type {
  TravelTheme,
  CreateTravelThemeDTO,
  UpdateTravelThemeDTO,
} from './types';

export interface TravelThemeListResponse {
  items: TravelTheme[];
  total: number;
}

// List all travel themes
export async function getTravelThemes(
  includeInactive = false
): Promise<TravelThemeListResponse> {
  const params = includeInactive ? '?include_inactive=true' : '';
  return apiClient.get(`/travel-themes${params}`);
}

// Get single theme by ID
export async function getTravelTheme(id: number): Promise<TravelTheme> {
  return apiClient.get(`/travel-themes/${id}`);
}

// Create new theme
export async function createTravelTheme(data: CreateTravelThemeDTO): Promise<TravelTheme> {
  return apiClient.post('/travel-themes', data);
}

// Update theme
export async function updateTravelTheme(
  id: number,
  data: UpdateTravelThemeDTO
): Promise<TravelTheme> {
  return apiClient.patch(`/travel-themes/${id}`, data);
}

// Delete theme
export async function deleteTravelTheme(id: number): Promise<void> {
  return apiClient.delete(`/travel-themes/${id}`);
}

// Seed default themes for tenant
export async function seedDefaultThemes(): Promise<TravelThemeListResponse> {
  return apiClient.post('/travel-themes/seed-defaults', {});
}

// Reorder themes
export async function reorderThemes(themeIds: number[]): Promise<TravelThemeListResponse> {
  return apiClient.post('/travel-themes/reorder', { theme_ids: themeIds });
}
