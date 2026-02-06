/**
 * API module for Accommodations
 * Manages hotels, riads, lodges, and their room categories, seasons, and rates
 */

import { apiClient } from './client';
import type {
  Accommodation,
  CreateAccommodationDTO,
  UpdateAccommodationDTO,
  RoomCategory,
  CreateRoomCategoryDTO,
  UpdateRoomCategoryDTO,
  AccommodationSeason,
  CreateAccommodationSeasonDTO,
  UpdateAccommodationSeasonDTO,
  RoomRate,
  CreateRoomRateDTO,
  UpdateRoomRateDTO,
  AccommodationPhoto,
  PaginatedResponse,
  AccommodationStatus,
  AvailabilitySearchParams,
  AvailabilityResult,
} from './types';

// ============================================================================
// Accommodation CRUD
// ============================================================================

export interface AccommodationFilters {
  supplier_id?: number;
  location_id?: number;
  country_code?: string;
  status?: AccommodationStatus;
  star_rating_min?: number;
  star_rating_max?: number;
  external_provider?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

/**
 * Get list of accommodations with filters
 */
export async function getAccommodations(
  params?: AccommodationFilters
): Promise<PaginatedResponse<Accommodation>> {
  const query = new URLSearchParams();

  if (params?.supplier_id) query.append('supplier_id', String(params.supplier_id));
  if (params?.location_id) query.append('location_id', String(params.location_id));
  if (params?.country_code) query.append('country_code', params.country_code);
  if (params?.status) query.append('status', params.status);
  if (params?.star_rating_min) query.append('star_rating_min', String(params.star_rating_min));
  if (params?.star_rating_max) query.append('star_rating_max', String(params.star_rating_max));
  if (params?.external_provider) query.append('external_provider', params.external_provider);
  if (params?.search) query.append('search', params.search);
  if (params?.page) query.append('page', String(params.page));
  if (params?.page_size) query.append('page_size', String(params.page_size));

  const queryString = query.toString();
  const endpoint = `/accommodations${queryString ? `?${queryString}` : ''}`;

  return apiClient.get<PaginatedResponse<Accommodation>>(endpoint);
}

/**
 * Get accommodation by ID (includes room categories, seasons, photos)
 */
export async function getAccommodation(id: number): Promise<Accommodation> {
  return apiClient.get<Accommodation>(`/accommodations/${id}`);
}

/**
 * Get accommodation by supplier ID
 */
export async function getAccommodationBySupplier(supplierId: number): Promise<Accommodation | null> {
  try {
    const result = await apiClient.get<Accommodation>(`/suppliers/${supplierId}/accommodation`);
    return result;
  } catch {
    return null;
  }
}

/**
 * Create a new accommodation
 */
export async function createAccommodation(
  data: CreateAccommodationDTO
): Promise<Accommodation> {
  return apiClient.post<Accommodation>('/accommodations', data);
}

/**
 * Update an existing accommodation
 */
export async function updateAccommodation(
  id: number,
  data: UpdateAccommodationDTO
): Promise<Accommodation> {
  return apiClient.patch<Accommodation>(`/accommodations/${id}`, data);
}

/**
 * Delete an accommodation
 */
export async function deleteAccommodation(id: number): Promise<void> {
  return apiClient.delete<void>(`/accommodations/${id}`);
}

// ============================================================================
// Room Categories
// ============================================================================

/**
 * Get room categories for an accommodation
 */
export async function getRoomCategories(accommodationId: number): Promise<RoomCategory[]> {
  return apiClient.get<RoomCategory[]>(`/accommodations/${accommodationId}/room-categories`);
}

/**
 * Get a single room category
 */
export async function getRoomCategory(
  accommodationId: number,
  categoryId: number
): Promise<RoomCategory> {
  return apiClient.get<RoomCategory>(
    `/accommodations/${accommodationId}/room-categories/${categoryId}`
  );
}

/**
 * Create a new room category
 */
export async function createRoomCategory(
  data: CreateRoomCategoryDTO
): Promise<RoomCategory> {
  return apiClient.post<RoomCategory>(
    `/accommodations/${data.accommodation_id}/room-categories`,
    data
  );
}

/**
 * Update an existing room category
 */
export async function updateRoomCategory(
  accommodationId: number,
  categoryId: number,
  data: UpdateRoomCategoryDTO
): Promise<RoomCategory> {
  return apiClient.patch<RoomCategory>(
    `/accommodations/${accommodationId}/room-categories/${categoryId}`,
    data
  );
}

/**
 * Delete a room category
 */
export async function deleteRoomCategory(
  accommodationId: number,
  categoryId: number
): Promise<void> {
  return apiClient.delete<void>(
    `/accommodations/${accommodationId}/room-categories/${categoryId}`
  );
}

/**
 * Reorder room categories
 */
export async function reorderRoomCategories(
  accommodationId: number,
  categoryIds: number[]
): Promise<void> {
  return apiClient.post<void>(
    `/accommodations/${accommodationId}/room-categories/reorder`,
    { category_ids: categoryIds }
  );
}

// ============================================================================
// Seasons
// ============================================================================

/**
 * Get seasons for an accommodation
 */
export async function getAccommodationSeasons(accommodationId: number): Promise<AccommodationSeason[]> {
  return apiClient.get<AccommodationSeason[]>(`/accommodations/${accommodationId}/seasons`);
}

/**
 * Get a single season
 */
export async function getAccommodationSeason(
  accommodationId: number,
  seasonId: number
): Promise<AccommodationSeason> {
  return apiClient.get<AccommodationSeason>(
    `/accommodations/${accommodationId}/seasons/${seasonId}`
  );
}

/**
 * Create a new season
 */
export async function createAccommodationSeason(
  data: CreateAccommodationSeasonDTO
): Promise<AccommodationSeason> {
  return apiClient.post<AccommodationSeason>(
    `/accommodations/${data.accommodation_id}/seasons`,
    data
  );
}

/**
 * Update an existing season
 */
export async function updateAccommodationSeason(
  accommodationId: number,
  seasonId: number,
  data: UpdateAccommodationSeasonDTO
): Promise<AccommodationSeason> {
  return apiClient.patch<AccommodationSeason>(
    `/accommodations/${accommodationId}/seasons/${seasonId}`,
    data
  );
}

/**
 * Delete a season
 */
export async function deleteAccommodationSeason(
  accommodationId: number,
  seasonId: number
): Promise<void> {
  return apiClient.delete<void>(
    `/accommodations/${accommodationId}/seasons/${seasonId}`
  );
}

/**
 * Get applicable season for a date
 */
export async function getSeasonForDate(
  accommodationId: number,
  date: string
): Promise<AccommodationSeason | null> {
  try {
    return await apiClient.get<AccommodationSeason>(
      `/accommodations/${accommodationId}/seasons/for-date?date=${date}`
    );
  } catch {
    return null;
  }
}

// ============================================================================
// Room Rates
// ============================================================================

/**
 * Get all rates for an accommodation
 */
export async function getRoomRates(
  accommodationId: number,
  params?: {
    room_category_id?: number;
    season_id?: number;
    bed_type?: string;
  }
): Promise<RoomRate[]> {
  const query = new URLSearchParams();
  if (params?.room_category_id) query.append('room_category_id', String(params.room_category_id));
  if (params?.season_id) query.append('season_id', String(params.season_id));
  if (params?.bed_type) query.append('bed_type', params.bed_type);

  const queryString = query.toString();
  const endpoint = `/accommodations/${accommodationId}/rates${queryString ? `?${queryString}` : ''}`;

  return apiClient.get<RoomRate[]>(endpoint);
}

/**
 * Get a single rate
 */
export async function getRoomRate(
  accommodationId: number,
  rateId: number
): Promise<RoomRate> {
  return apiClient.get<RoomRate>(`/accommodations/${accommodationId}/rates/${rateId}`);
}

/**
 * Create a new rate
 */
export async function createRoomRate(data: CreateRoomRateDTO): Promise<RoomRate> {
  return apiClient.post<RoomRate>(
    `/accommodations/${data.accommodation_id}/rates`,
    data
  );
}

/**
 * Update an existing rate
 */
export async function updateRoomRate(
  accommodationId: number,
  rateId: number,
  data: UpdateRoomRateDTO
): Promise<RoomRate> {
  return apiClient.patch<RoomRate>(
    `/accommodations/${accommodationId}/rates/${rateId}`,
    data
  );
}

/**
 * Delete a rate
 */
export async function deleteRoomRate(
  accommodationId: number,
  rateId: number
): Promise<void> {
  return apiClient.delete<void>(`/accommodations/${accommodationId}/rates/${rateId}`);
}

/**
 * Bulk create or update rates (for rate grid management)
 */
export async function bulkUpsertRates(
  accommodationId: number,
  rates: CreateRoomRateDTO[]
): Promise<RoomRate[]> {
  return apiClient.post<RoomRate[]>(
    `/accommodations/${accommodationId}/rates/bulk`,
    { rates }
  );
}

/**
 * Get rate for specific criteria (for quotation engine)
 */
export async function getRateForCriteria(
  accommodationId: number,
  params: {
    room_category_id: number;
    bed_type: string;
    date: string;
    meal_plan?: string;
  }
): Promise<RoomRate | null> {
  const query = new URLSearchParams();
  query.append('room_category_id', String(params.room_category_id));
  query.append('bed_type', params.bed_type);
  query.append('date', params.date);
  if (params.meal_plan) query.append('meal_plan', params.meal_plan);

  try {
    return await apiClient.get<RoomRate>(
      `/accommodations/${accommodationId}/rates/for-criteria?${query.toString()}`
    );
  } catch {
    return null;
  }
}

// ============================================================================
// Photos
// ============================================================================

/**
 * Get photos for an accommodation
 */
export async function getAccommodationPhotos(
  accommodationId: number,
  roomCategoryId?: number
): Promise<AccommodationPhoto[]> {
  const query = roomCategoryId ? `?room_category_id=${roomCategoryId}` : '';
  return apiClient.get<AccommodationPhoto[]>(
    `/accommodations/${accommodationId}/photos${query}`
  );
}

/**
 * Upload a photo
 */
export async function uploadAccommodationPhoto(
  accommodationId: number,
  file: File,
  options?: {
    room_category_id?: number;
    caption?: string;
    is_main?: boolean;
  }
): Promise<AccommodationPhoto> {
  const formData = new FormData();
  formData.append('file', file);
  if (options?.room_category_id) {
    formData.append('room_category_id', String(options.room_category_id));
  }
  if (options?.caption) formData.append('caption', options.caption);
  if (options?.is_main !== undefined) formData.append('is_main', String(options.is_main));

  return apiClient.upload<AccommodationPhoto>(
    `/accommodations/${accommodationId}/photos`,
    formData
  );
}

/**
 * Update photo metadata
 */
export async function updateAccommodationPhoto(
  accommodationId: number,
  photoId: number,
  data: {
    caption?: string;
    is_main?: boolean;
    sort_order?: number;
  }
): Promise<AccommodationPhoto> {
  return apiClient.patch<AccommodationPhoto>(
    `/accommodations/${accommodationId}/photos/${photoId}`,
    data
  );
}

/**
 * Delete a photo
 */
export async function deleteAccommodationPhoto(
  accommodationId: number,
  photoId: number
): Promise<void> {
  return apiClient.delete<void>(`/accommodations/${accommodationId}/photos/${photoId}`);
}

/**
 * Reorder photos
 */
export async function reorderAccommodationPhotos(
  accommodationId: number,
  photoIds: number[],
  roomCategoryId?: number
): Promise<void> {
  return apiClient.post<void>(
    `/accommodations/${accommodationId}/photos/reorder`,
    { photo_ids: photoIds, room_category_id: roomCategoryId }
  );
}

// ============================================================================
// External Availability (RateHawk, HotelBeds, etc.)
// ============================================================================

/**
 * Search for availability from external providers
 */
export async function searchExternalAvailability(
  params: AvailabilitySearchParams
): Promise<AvailabilityResult[]> {
  return apiClient.post<AvailabilityResult[]>('/accommodations/availability/search', params);
}

/**
 * Get availability for a specific accommodation (compare contract vs external)
 */
export async function getAccommodationAvailability(
  accommodationId: number,
  params: Omit<AvailabilitySearchParams, 'accommodation_id' | 'location_id'>
): Promise<AvailabilityResult> {
  return apiClient.post<AvailabilityResult>(
    `/accommodations/${accommodationId}/availability`,
    params
  );
}

/**
 * Sync accommodation data from external provider
 */
export async function syncFromExternalProvider(
  accommodationId: number
): Promise<Accommodation> {
  return apiClient.post<Accommodation>(
    `/accommodations/${accommodationId}/sync`,
    {}
  );
}

/**
 * Link an existing accommodation to an external provider
 */
export async function linkToExternalProvider(
  accommodationId: number,
  provider: 'ratehawk' | 'hotelbeds' | 'amadeus',
  externalId: string
): Promise<Accommodation> {
  return apiClient.post<Accommodation>(
    `/accommodations/${accommodationId}/link-external`,
    { provider, external_id: externalId }
  );
}

// ============================================================================
// Rate Calculations (for quotation engine)
// ============================================================================

export interface StayRateRequest {
  accommodation_id: number;
  room_category_id: number;
  bed_type: string;
  check_in: string;
  check_out: string;
  occupancy: {
    adults: number;
    children?: number;
    children_ages?: number[];
  };
  meal_plan?: string;
}

export interface StayRateResult {
  accommodation_id: number;
  room_category_id: number;
  room_category_name: string;
  bed_type: string;
  nights: number;
  daily_rates: {
    date: string;
    season_id?: number;
    season_name?: string;
    rate_per_night: number;
    currency: string;
  }[];
  total_cost: number;
  currency: string;
  meal_plan: string;
  supplements: {
    type: string;
    description: string;
    amount: number;
  }[];
  total_with_supplements: number;
}

/**
 * Calculate rate for a complete stay
 */
export async function calculateStayRate(
  params: StayRateRequest
): Promise<StayRateResult> {
  return apiClient.post<StayRateResult>('/accommodations/calculate-stay', params);
}

/**
 * Calculate rates for multiple room configurations
 */
export async function calculateMultiRoomStay(
  accommodationId: number,
  params: {
    check_in: string;
    check_out: string;
    rooms: {
      room_category_id: number;
      bed_type: string;
      occupancy: {
        adults: number;
        children?: number;
        children_ages?: number[];
      };
    }[];
    meal_plan?: string;
  }
): Promise<{
  rooms: StayRateResult[];
  total_cost: number;
  currency: string;
}> {
  return apiClient.post<{
    rooms: StayRateResult[];
    total_cost: number;
    currency: string;
  }>(`/accommodations/${accommodationId}/calculate-multi-room`, params);
}
