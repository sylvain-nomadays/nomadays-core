/**
 * Location API module
 * Gère les locations indépendantes des trips (pour filtrage et organisation)
 * Représente des destinations géographiques : Chiang Mai, Bangkok, Marrakech, etc.
 */

import { apiClient } from './client';
import type {
  Location,
  LocationType,
  CreateLocationDTO,
  UpdateLocationDTO,
  PaginatedResponse,
  GeocodeResult,
  PlaceAutocompleteResult,
} from './types';

// ============================================================================
// Location CRUD
// ============================================================================

/**
 * Liste les locations avec filtres optionnels
 */
export async function getLocations(params?: {
  location_type?: LocationType;
  country_code?: string;
  parent_id?: number;
  search?: string;
  is_active?: boolean;
  page?: number;
  page_size?: number;
}): Promise<PaginatedResponse<Location>> {
  const searchParams = new URLSearchParams();

  if (params?.location_type) searchParams.append('location_type', params.location_type);
  if (params?.country_code) searchParams.append('country_code', params.country_code);
  if (params?.parent_id !== undefined) searchParams.append('parent_id', String(params.parent_id));
  if (params?.search) searchParams.append('search', params.search);
  if (params?.is_active !== undefined) searchParams.append('is_active', String(params.is_active));
  if (params?.page) searchParams.append('page', String(params.page));
  if (params?.page_size) searchParams.append('page_size', String(params.page_size));

  const query = searchParams.toString();
  return apiClient.get<PaginatedResponse<Location>>(`/locations${query ? `?${query}` : ''}`);
}

/**
 * Liste les locations par pays
 */
export async function getLocationsByCountry(countryCode: string, locationType?: LocationType): Promise<Location[]> {
  const params = new URLSearchParams();
  if (locationType) params.append('location_type', locationType);
  const query = params.toString();
  return apiClient.get<Location[]>(`/locations/by-country/${countryCode}${query ? `?${query}` : ''}`);
}

/**
 * Récupère une location par son ID
 */
export async function getLocation(id: number): Promise<Location> {
  return apiClient.get<Location>(`/locations/${id}`);
}

/**
 * Crée une nouvelle location
 */
export async function createLocation(data: CreateLocationDTO): Promise<Location> {
  return apiClient.post<Location>('/locations', data);
}

/**
 * Met à jour une location existante
 */
export async function updateLocation(id: number, data: UpdateLocationDTO): Promise<Location> {
  return apiClient.patch<Location>(`/locations/${id}`, data);
}

/**
 * Supprime une location
 */
export async function deleteLocation(id: number): Promise<void> {
  return apiClient.delete<void>(`/locations/${id}`);
}

// ============================================================================
// Geocoding
// ============================================================================

/**
 * Géocode un lieu par son nom et crée automatiquement une location
 */
export async function geocodeAndCreateLocation(params: {
  name: string;
  place_id?: string;
  country_code?: string;
}): Promise<Location> {
  return apiClient.post<Location>('/locations/geocode-and-create', params);
}

/**
 * Géocode un lieu sans créer de location (pour prévisualisation)
 */
export async function geocodePlace(params: {
  address?: string;
  place_id?: string;
}): Promise<GeocodeResult> {
  const searchParams = new URLSearchParams();
  if (params.address) searchParams.append('address', params.address);
  if (params.place_id) searchParams.append('place_id', params.place_id);

  return apiClient.get<GeocodeResult>(`/locations/geocode?${searchParams.toString()}`);
}

/**
 * Recherche autocomplete de lieux via Google Places API
 */
export async function placesAutocomplete(params: {
  query: string;
  country?: string;
  types?: string; // e.g., 'locality', 'establishment'
}): Promise<PlaceAutocompleteResult[]> {
  const searchParams = new URLSearchParams();
  searchParams.append('query', params.query);
  if (params.country) searchParams.append('country', params.country);
  if (params.types) searchParams.append('types', params.types);

  return apiClient.get<PlaceAutocompleteResult[]>(`/locations/autocomplete?${searchParams.toString()}`);
}

// ============================================================================
// Bulk operations
// ============================================================================

/**
 * Récupère plusieurs locations par leurs IDs
 */
export async function getLocationsByIds(ids: number[]): Promise<Location[]> {
  if (ids.length === 0) return [];

  const searchParams = new URLSearchParams();
  ids.forEach(id => searchParams.append('ids', String(id)));

  return apiClient.get<Location[]>(`/locations/bulk?${searchParams.toString()}`);
}

/**
 * Recherche rapide de locations pour les sélecteurs
 */
export async function searchLocations(params: {
  query: string;
  country_code?: string;
  limit?: number;
}): Promise<Location[]> {
  const searchParams = new URLSearchParams();
  searchParams.append('query', params.query);
  if (params.country_code) searchParams.append('country_code', params.country_code);
  if (params.limit) searchParams.append('limit', String(params.limit));

  return apiClient.get<Location[]>(`/locations/search?${searchParams.toString()}`);
}
