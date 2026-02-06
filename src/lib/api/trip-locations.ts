/**
 * Trip Locations API module
 * Manages geographic waypoints, geocoding, and routes
 */

import { apiClient } from './client';
import type {
  TripLocation,
  CreateTripLocationDTO,
  UpdateTripLocationDTO,
  TripRoute,
  TripMapData,
  PlaceAutocompleteResult,
  GeocodeResult,
  TravelMode,
} from './types';

// ============================================================================
// Places Autocomplete (search locations by name)
// ============================================================================

export interface PlacesAutocompleteParams {
  query: string;
  country?: string;
}

/**
 * Search for places using autocomplete.
 * Use this for the "type Chiang Mai" → suggestions flow.
 */
export async function placesAutocomplete(
  params: PlacesAutocompleteParams
): Promise<PlaceAutocompleteResult[]> {
  return apiClient.post('/places/autocomplete', params);
}

/**
 * Geocode a place by ID or address to get coordinates.
 */
export async function geocodePlace(params: {
  place_id?: string;
  address?: string;
}): Promise<GeocodeResult | null> {
  return apiClient.post('/places/geocode', params);
}

// ============================================================================
// Trip Locations CRUD
// ============================================================================

/**
 * List all locations for a trip.
 */
export async function getTripLocations(tripId: number): Promise<TripLocation[]> {
  return apiClient.get(`/trips/${tripId}/locations`);
}

/**
 * Create a new location for a trip.
 */
export async function createTripLocation(
  tripId: number,
  data: CreateTripLocationDTO
): Promise<TripLocation> {
  return apiClient.post(`/trips/${tripId}/locations`, data);
}

/**
 * Geocode a location name and create it in one call.
 * This is the main function for "type Chiang Mai → add to map".
 */
export async function geocodeAndCreateLocation(
  tripId: number,
  params: {
    name: string;
    place_id?: string;
    day_number?: number;
    location_type?: string;
  }
): Promise<TripLocation> {
  const queryParams = new URLSearchParams({
    name: params.name,
    ...(params.place_id && { place_id: params.place_id }),
    ...(params.day_number !== undefined && { day_number: String(params.day_number) }),
    ...(params.location_type && { location_type: params.location_type }),
  });
  return apiClient.post(`/trips/${tripId}/locations/geocode-and-create?${queryParams}`);
}

/**
 * Update a location.
 */
export async function updateTripLocation(
  tripId: number,
  locationId: number,
  data: UpdateTripLocationDTO
): Promise<TripLocation> {
  return apiClient.patch(`/trips/${tripId}/locations/${locationId}`, data);
}

/**
 * Delete a location.
 */
export async function deleteTripLocation(
  tripId: number,
  locationId: number
): Promise<void> {
  return apiClient.delete(`/trips/${tripId}/locations/${locationId}`);
}

// ============================================================================
// Routes
// ============================================================================

/**
 * Calculate routes between all consecutive locations.
 */
export async function calculateRoutes(
  tripId: number,
  travelMode: TravelMode = 'driving'
): Promise<TripRoute[]> {
  return apiClient.post(`/trips/${tripId}/locations/calculate-routes?travel_mode=${travelMode}`);
}

/**
 * Get complete map data (locations + routes).
 */
export async function getTripMapData(tripId: number): Promise<TripMapData> {
  return apiClient.get(`/trips/${tripId}/locations/map-data`);
}
