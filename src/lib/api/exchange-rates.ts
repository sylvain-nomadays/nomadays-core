/**
 * Exchange Rates API module
 * Manages currency exchange rates for trips (manual + Kantox integration)
 */

import { apiClient } from './client';
import type { ExchangeRateEntry, CurrencyRates } from './types';

export interface TripRatesResponse {
  trip_id: number;
  base_currency: string;
  rates: Record<string, ExchangeRateEntry>;
  missing_currencies: string[];
}

export interface SetManualRateRequest {
  from_currency: string;
  rate: number;
}

export interface SetManualRatesBatchRequest {
  rates: Record<string, number>;
}

export interface LockRatesRequest {
  lock_all?: boolean;
  currencies?: string[];
}

// Get all rates for a trip
export async function getTripRates(tripId: number): Promise<TripRatesResponse> {
  return apiClient.get(`/exchange-rates/trips/${tripId}`);
}

// Set a single manual rate
export async function setManualRate(
  tripId: number,
  fromCurrency: string,
  rate: number
): Promise<TripRatesResponse> {
  return apiClient.post(`/exchange-rates/trips/${tripId}/manual`, {
    from_currency: fromCurrency,
    rate,
  });
}

// Set multiple manual rates at once
export async function setManualRatesBatch(
  tripId: number,
  rates: Record<string, number>
): Promise<TripRatesResponse> {
  return apiClient.post(`/exchange-rates/trips/${tripId}/manual-batch`, { rates });
}

// Lock rates (mark with timestamp for quote)
export async function lockRates(
  tripId: number,
  options?: LockRatesRequest
): Promise<TripRatesResponse> {
  return apiClient.post(`/exchange-rates/trips/${tripId}/lock`, options || { lock_all: true });
}

// Delete a rate
export async function deleteRate(tripId: number, currency: string): Promise<TripRatesResponse> {
  return apiClient.delete(`/exchange-rates/trips/${tripId}/${currency}`);
}

// Kantox integration (when available)
export interface KantoxRateResponse {
  from_currency: string;
  to_currency: string;
  rate: number;
  source: 'kantox';
  timestamp: string;
}

// Get live spot rate from Kantox
export async function getKantoxLiveRate(
  fromCurrency: string,
  toCurrency = 'EUR'
): Promise<KantoxRateResponse> {
  return apiClient.get(`/exchange-rates/kantox/live?from_currency=${fromCurrency}&to_currency=${toCurrency}`);
}

// Get forward rate from Kantox
export async function getKantoxForwardRate(
  fromCurrency: string,
  valueDate: string,
  toCurrency = 'EUR'
): Promise<KantoxRateResponse> {
  return apiClient.get(
    `/exchange-rates/kantox/forward?from_currency=${fromCurrency}&to_currency=${toCurrency}&value_date=${valueDate}`
  );
}

// Fetch and apply Kantox rates to trip
export async function fetchKantoxRates(
  tripId: number,
  currencies: string[]
): Promise<TripRatesResponse> {
  const params = currencies.map(c => `currencies=${c}`).join('&');
  return apiClient.post(`/exchange-rates/trips/${tripId}/fetch-kantox?${params}`, {});
}
