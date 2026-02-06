/**
 * Trips API module
 */

import { apiClient } from './client';
import type {
  Trip,
  TripDay,
  TripPaxConfig,
  Formula,
  Item,
  CreateTripDTO,
  UpdateTripDTO,
  QuotationResult,
} from './types';

// Trips
export async function getTrips(params?: {
  type?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: Trip[]; total: number }> {
  const searchParams = new URLSearchParams();
  if (params?.type) searchParams.append('type', params.type);
  if (params?.status) searchParams.append('status', params.status);
  if (params?.limit) searchParams.append('limit', params.limit.toString());
  if (params?.offset) searchParams.append('offset', params.offset.toString());

  const query = searchParams.toString();
  return apiClient.get(`/trips${query ? `?${query}` : ''}`);
}

export async function getTrip(id: number): Promise<Trip> {
  return apiClient.get(`/trips/${id}`);
}

export async function getTripWithStructure(id: number): Promise<Trip> {
  return apiClient.get(`/trips/${id}/full`);
}

export async function createTrip(data: CreateTripDTO): Promise<Trip> {
  return apiClient.post('/trips', data);
}

export async function updateTrip(id: number, data: UpdateTripDTO): Promise<Trip> {
  return apiClient.patch(`/trips/${id}`, data);
}

export async function deleteTrip(id: number): Promise<void> {
  return apiClient.delete(`/trips/${id}`);
}

export async function duplicateTrip(id: number, name?: string): Promise<Trip> {
  return apiClient.post(`/trips/${id}/duplicate`, { name });
}

// Trip Days
export async function getTripDays(tripId: number): Promise<TripDay[]> {
  return apiClient.get(`/trips/${tripId}/days`);
}

export async function createTripDay(
  tripId: number,
  data: { day_number: number; title?: string; description?: string }
): Promise<TripDay> {
  return apiClient.post(`/trips/${tripId}/days`, data);
}

export async function updateTripDay(
  tripId: number,
  dayId: number,
  data: Partial<TripDay>
): Promise<TripDay> {
  return apiClient.patch(`/trips/${tripId}/days/${dayId}`, data);
}

export async function deleteTripDay(tripId: number, dayId: number): Promise<void> {
  return apiClient.delete(`/trips/${tripId}/days/${dayId}`);
}

// Pax Configs
export async function getTripPaxConfigs(tripId: number): Promise<TripPaxConfig[]> {
  return apiClient.get(`/trips/${tripId}/pax-configs`);
}

export async function createPaxConfig(
  tripId: number,
  data: { label: string; total_pax: number; args_json?: Record<string, number> }
): Promise<TripPaxConfig> {
  return apiClient.post(`/trips/${tripId}/pax-configs`, data);
}

export async function updatePaxConfig(
  tripId: number,
  configId: number,
  data: Partial<TripPaxConfig>
): Promise<TripPaxConfig> {
  return apiClient.patch(`/trips/${tripId}/pax-configs/${configId}`, data);
}

export async function deletePaxConfig(tripId: number, configId: number): Promise<void> {
  return apiClient.delete(`/trips/${tripId}/pax-configs/${configId}`);
}

// Formulas (via trip-structure endpoint)
export async function getFormulas(dayId: number): Promise<Formula[]> {
  return apiClient.get(`/trip-structure/days/${dayId}/formulas`);
}

export async function createFormula(
  dayId: number,
  data: { name: string; description_html?: string; service_day_start?: number; service_day_end?: number }
): Promise<Formula> {
  return apiClient.post(`/trip-structure/days/${dayId}/formulas`, data);
}

export async function updateFormula(formulaId: number, data: Partial<Formula>): Promise<Formula> {
  return apiClient.patch(`/trip-structure/formulas/${formulaId}`, data);
}

export async function deleteFormula(formulaId: number): Promise<void> {
  return apiClient.delete(`/trip-structure/formulas/${formulaId}`);
}

// Items
export async function getItems(formulaId: number): Promise<Item[]> {
  return apiClient.get(`/trip-structure/formulas/${formulaId}/items`);
}

export async function createItem(
  formulaId: number,
  data: Partial<Item>
): Promise<Item> {
  return apiClient.post(`/trip-structure/formulas/${formulaId}/items`, data);
}

export async function updateItem(itemId: number, data: Partial<Item>): Promise<Item> {
  return apiClient.patch(`/trip-structure/items/${itemId}`, data);
}

export async function deleteItem(itemId: number): Promise<void> {
  return apiClient.delete(`/trip-structure/items/${itemId}`);
}

export async function duplicateItem(itemId: number, targetFormulaId?: number): Promise<Item> {
  const params = targetFormulaId ? `?target_formula_id=${targetFormulaId}` : '';
  return apiClient.post(`/trip-structure/items/${itemId}/duplicate${params}`, {});
}

// Quotation
export async function calculateQuotation(tripId: number): Promise<QuotationResult> {
  return apiClient.post(`/quotation/${tripId}/calculate`, {});
}

export async function simulateQuotation(
  tripId: number,
  paxArgs: Record<string, number>,
  marginOverride?: number
): Promise<{
  total_pax: number;
  pax_args: Record<string, number>;
  total_cost: number;
  total_price: number;
  total_profit: number;
  cost_per_person: number;
  price_per_person: number;
  margin_pct: number;
}> {
  return apiClient.post(`/quotation/${tripId}/simulate`, {
    pax_args: paxArgs,
    margin_override: marginOverride,
  });
}
